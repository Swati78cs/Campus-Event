const VolunteerAssignment = require('../models/VolunteerAssignment');
const Event = require('../models/Event');
const Club = require('../models/Club');
const User = require('../models/User');

class VolunteerError extends Error {
  constructor(message, code = 'VOLUNTEER_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'VolunteerError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Escape special regex characters in search queries.
 */
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Verify event management permission for organizers and admins.
 * Admins have global permission. Organizers must be assigned to the event's club.
 */
const assertEventManagementAccess = async (event, user) => {
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
      throw new VolunteerError(
        'You are not authorized to manage volunteers for this club event.',
        'FORBIDDEN',
        403
      );
    }
    return true;
  }

  throw new VolunteerError(
    'Only event organizers and administrators can manage volunteers.',
    'FORBIDDEN',
    403
  );
};

/**
 * Search active users eligible for volunteer assignment.
 * Eligible roles: student, organizer, admin.
 */
const searchEligibleUsers = async (searchTerm = '', limit = 10) => {
  const filter = { isActive: true };

  const trimmed = searchTerm.trim();
  if (trimmed) {
    const safeRegex = new RegExp(escapeRegex(trimmed), 'i');
    filter.$or = [{ name: safeRegex }, { email: safeRegex }];
  }

  const users = await User.find(filter)
    .select('_id name email role isActive')
    .limit(limit)
    .sort({ name: 1 });

  return users;
};

/**
 * Assign an active user as a volunteer to an event.
 */
const assignVolunteer = async (eventId, targetUserId, currentUser) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new VolunteerError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  // Authorization check
  await assertEventManagementAccess(event, currentUser);

  // Validate target user
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new VolunteerError('Target user not found.', 'USER_NOT_FOUND', 404);
  }

  if (!targetUser.isActive) {
    throw new VolunteerError(
      'Cannot assign an inactive user as a volunteer.',
      'USER_INACTIVE',
      400
    );
  }

  // Check existing active assignment
  const existingAssignment = await VolunteerAssignment.findOne({
    event: event._id,
    user: targetUser._id,
    status: 'active',
  });

  if (existingAssignment) {
    throw new VolunteerError(
      'This user is already an active volunteer for this event.',
      'ALREADY_ASSIGNED',
      409
    );
  }

  // Create new active volunteer assignment
  const assignment = new VolunteerAssignment({
    event: event._id,
    user: targetUser._id,
    assignedBy: currentUser._id,
    assignedAt: new Date(),
    status: 'active',
  });

  try {
    await assignment.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new VolunteerError(
        'This user is already an active volunteer for this event.',
        'ALREADY_ASSIGNED',
        409
      );
    }
    throw error;
  }

  return await assignment.populate([
    { path: 'user', select: 'name email role isActive' },
    { path: 'assignedBy', select: 'name email' },
  ]);
};

/**
 * Get volunteers assigned to an event.
 */
const getEventVolunteers = async (eventId, currentUser, statusFilter = 'active') => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new VolunteerError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  // Authorization check
  await assertEventManagementAccess(event, currentUser);

  const filter = { event: event._id };
  if (statusFilter !== 'all') {
    filter.status = statusFilter;
  }

  const assignments = await VolunteerAssignment.find(filter)
    .populate('user', 'name email role isActive')
    .populate('assignedBy', 'name email')
    .populate('removedBy', 'name email')
    .sort({ assignedAt: -1 });

  return {
    event: {
      _id: event._id,
      title: event.title,
      status: event.status,
    },
    volunteers: assignments,
  };
};

/**
 * Remove a volunteer from an event (marks status 'removed', preserves history).
 */
const removeVolunteer = async (eventId, targetUserId, currentUser) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new VolunteerError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  // Authorization check
  await assertEventManagementAccess(event, currentUser);

  const assignment = await VolunteerAssignment.findOne({
    event: event._id,
    user: targetUserId,
    status: 'active',
  });

  if (!assignment) {
    throw new VolunteerError(
      'No active volunteer assignment found for this user.',
      'ASSIGNMENT_NOT_FOUND',
      404
    );
  }

  // Update status to removed and record audit fields
  assignment.status = 'removed';
  assignment.removedAt = new Date();
  assignment.removedBy = currentUser._id;
  await assignment.save();

  return await assignment.populate([
    { path: 'user', select: 'name email role isActive' },
    { path: 'removedBy', select: 'name email' },
  ]);
};

/**
 * Get active events assigned to the authenticated volunteer.
 */
const getMyAssignedEvents = async (currentUser, queryParams = {}) => {
  const { page = 1, limit = 20 } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = {
    user: currentUser._id,
    status: 'active',
  };

  const [assignments, total] = await Promise.all([
    VolunteerAssignment.find(filter)
      .populate({
        path: 'event',
        select: 'title description category venue startDateTime endDateTime status bannerUrl club',
        populate: { path: 'club', select: 'name category' },
      })
      .sort({ assignedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    VolunteerAssignment.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);

  return {
    assignments,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

/**
 * Verify whether a specific user is currently an active volunteer for an event.
 */
const isUserActiveVolunteerForEvent = async (eventId, userId) => {
  const assignment = await VolunteerAssignment.findOne({
    event: eventId,
    user: userId,
    status: 'active',
  });
  return Boolean(assignment);
};

module.exports = {
  VolunteerError,
  searchEligibleUsers,
  assignVolunteer,
  getEventVolunteers,
  removeVolunteer,
  getMyAssignedEvents,
  isUserActiveVolunteerForEvent,
};
