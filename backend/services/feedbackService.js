const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const Attendance = require('../models/Attendance');
const Club = require('../models/Club');
const User = require('../models/User');

class FeedbackError extends Error {
  constructor(message, code = 'FEEDBACK_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'FeedbackError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Verify if organizer or admin has management access to the event.
 */
const assertOrganizerFeedbackAccess = async (event, user) => {
  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'organizer') {
    const club = await Club.findById(event.club);
    const isAssigned =
      club &&
      club.organizers &&
      club.organizers.some((orgId) => orgId.toString() === user._id.toString());

    if (!isAssigned) {
      throw new FeedbackError(
        'You are not authorized to view feedback for events outside your managed clubs.',
        'UNAUTHORIZED_FEEDBACK_ACCESS',
        403
      );
    }
    return true;
  }

  throw new FeedbackError(
    'Access denied: Only event organizers and administrators can view event feedback management.',
    'UNAUTHORIZED_FEEDBACK_ACCESS',
    403
  );
};

/**
 * Check feedback eligibility for a specific student and event.
 */
const checkFeedbackEligibility = async (eventId, user) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new FeedbackError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  if (event.status === 'cancelled') {
    return {
      event,
      isCompleted: false,
      hasAttended: false,
      canSubmit: false,
      reason: 'EVENT_CANCELLED',
      feedback: null,
    };
  }

  const now = new Date();
  const isCompleted = now > new Date(event.endDateTime);

  if (!isCompleted) {
    return {
      event,
      isCompleted: false,
      hasAttended: false,
      canSubmit: false,
      reason: 'EVENT_NOT_COMPLETED',
      feedback: null,
    };
  }

  if (!user || !user.isActive) {
    return {
      event,
      isCompleted: true,
      hasAttended: false,
      canSubmit: false,
      reason: 'INACTIVE_USER',
      feedback: null,
    };
  }

  // Check authoritative Attendance record
  const attendance = await Attendance.findOne({
    event: eventId,
    student: user._id,
    status: { $in: ['checked_in', 'overridden'] },
  });

  const hasAttended = Boolean(attendance);

  if (!hasAttended) {
    return {
      event,
      isCompleted: true,
      hasAttended: false,
      canSubmit: false,
      reason: 'ATTENDANCE_REQUIRED',
      feedback: null,
    };
  }

  // Check if student has already submitted feedback
  const existingFeedback = await Feedback.findOne({
    event: eventId,
    student: user._id,
  });

  if (existingFeedback) {
    return {
      event,
      isCompleted: true,
      hasAttended: true,
      canSubmit: false,
      reason: 'ALREADY_SUBMITTED',
      feedback: existingFeedback,
    };
  }

  return {
    event,
    isCompleted: true,
    hasAttended: true,
    canSubmit: true,
    reason: null,
    feedback: null,
  };
};

/**
 * Submit feedback for an event.
 */
const submitFeedback = async (eventId, user, { rating, comment }) => {
  // Check active account status in DB
  const currentUser = await User.findById(user._id);
  if (!currentUser || !currentUser.isActive) {
    throw new FeedbackError(
      'Your account is deactivated. Inactive users cannot submit feedback.',
      'INACTIVE_USER',
      403
    );
  }

  const eligibility = await checkFeedbackEligibility(eventId, currentUser);

  if (!eligibility.canSubmit) {
    if (eligibility.reason === 'ALREADY_SUBMITTED') {
      throw new FeedbackError(
        'You have already submitted feedback for this event.',
        'DUPLICATE_FEEDBACK',
        409,
        { existingFeedbackId: eligibility.feedback._id }
      );
    }
    if (eligibility.reason === 'EVENT_NOT_COMPLETED') {
      throw new FeedbackError(
        'Feedback can only be submitted after the event has concluded.',
        'EVENT_NOT_COMPLETED',
        400
      );
    }
    if (eligibility.reason === 'EVENT_CANCELLED') {
      throw new FeedbackError(
        'Cannot submit feedback for a cancelled event.',
        'EVENT_CANCELLED',
        400
      );
    }
    if (eligibility.reason === 'ATTENDANCE_REQUIRED') {
      throw new FeedbackError(
        'Only verified attendees who checked in to this event can submit feedback.',
        'ATTENDANCE_REQUIRED',
        403
      );
    }
    throw new FeedbackError(
      'You are not eligible to submit feedback for this event.',
      'INELIGIBLE_FOR_FEEDBACK',
      400
    );
  }

  try {
    const feedback = await Feedback.create({
      event: eventId,
      student: currentUser._id,
      rating,
      comment: typeof comment === 'string' ? comment.trim() : '',
    });

    return feedback;
  } catch (err) {
    // Database compound unique constraint violation (event + student)
    if (err.code === 11000) {
      throw new FeedbackError(
        'You have already submitted feedback for this event.',
        'DUPLICATE_FEEDBACK',
        409
      );
    }
    throw err;
  }
};

/**
 * Get student's own feedback and eligibility for an event.
 */
const getStudentFeedback = async (eventId, user) => {
  const currentUser = await User.findById(user._id);
  if (!currentUser || !currentUser.isActive) {
    throw new FeedbackError('User account not found or inactive.', 'INACTIVE_USER', 403);
  }

  const eligibility = await checkFeedbackEligibility(eventId, currentUser);

  return {
    isCompleted: eligibility.isCompleted,
    hasAttended: eligibility.hasAttended,
    canSubmit: eligibility.canSubmit,
    reason: eligibility.reason,
    feedback: eligibility.feedback,
  };
};

/**
 * Retrieve paginated event feedback and stats for organizers/admins.
 */
const getEventFeedback = async (eventId, user, { page = 1, limit = 20, rating }) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new FeedbackError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  // Authorization check (organizer assigned to club or admin)
  await assertOrganizerFeedbackAccess(event, user);

  const eventObjectId = new mongoose.Types.ObjectId(eventId);

  // Calculate overall feedback stats (average rating and total count) from all feedback for this event
  const statsAggregation = await Feedback.aggregate([
    { $match: { event: eventObjectId } },
    {
      $group: {
        _id: null,
        totalFeedback: { $sum: 1 },
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  const totalFeedback = statsAggregation.length > 0 ? statsAggregation[0].totalFeedback : 0;
  const averageRating =
    statsAggregation.length > 0 && statsAggregation[0].averageRating !== null
      ? Number(statsAggregation[0].averageRating.toFixed(1))
      : 0;

  // Build filter for list queries
  const filter = { event: eventObjectId };
  if (rating) {
    filter.rating = rating;
  }

  const skip = (page - 1) * limit;

  const [feedbacks, totalMatching] = await Promise.all([
    Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('student', 'name email') // Privacy: only expose non-sensitive student info
      .lean(),
    Feedback.countDocuments(filter),
  ]);

  return {
    feedback: feedbacks,
    stats: {
      averageRating,
      totalFeedback,
    },
    pagination: {
      page,
      limit,
      total: totalMatching,
      totalPages: Math.ceil(totalMatching / limit) || 1,
    },
  };
};

module.exports = {
  FeedbackError,
  checkFeedbackEligibility,
  submitFeedback,
  getStudentFeedback,
  getEventFeedback,
  assertOrganizerFeedbackAccess,
};
