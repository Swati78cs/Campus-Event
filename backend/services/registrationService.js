const mongoose = require('mongoose');
const crypto = require('crypto');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Club = require('../models/Club');

class RegistrationError extends Error {
  constructor(message, code = 'REGISTRATION_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'RegistrationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Register a student for an event using a MongoDB session & transaction.
 * Guarantees atomic capacity enforcement, duplicate checks, and state rollbacks.
 */
const registerForEvent = async (eventId, user) => {
  if (user.role !== 'student') {
    throw new RegistrationError(
      'Only students can register for events. Organizers and administrators cannot register.',
      'FORBIDDEN',
      403
    );
  }

  if (!user.isActive) {
    throw new RegistrationError('Your account is deactivated.', 'USER_INACTIVE', 403);
  }

  // Retry loop for transient MongoDB transaction conflicts (e.g. WriteConflict code 112)
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Fetch event within transaction session
      const event = await Event.findById(eventId).session(session);

      if (!event) {
        throw new RegistrationError('Event not found.', 'EVENT_NOT_FOUND', 404);
      }

      // 2. Lifecycle and state checks
      if (event.status === 'cancelled') {
        throw new RegistrationError('This event has been cancelled.', 'EVENT_CANCELLED', 400);
      }

      if (event.status !== 'published') {
        throw new RegistrationError('Event is not published for registration.', 'EVENT_NOT_OPEN', 400);
      }

      const now = new Date();
      if (now > new Date(event.registrationDeadline)) {
        throw new RegistrationError(
          'The registration deadline for this event has passed.',
          'REGISTRATION_CLOSED',
          400
        );
      }

      if (now > new Date(event.endDateTime)) {
        throw new RegistrationError('This event has already concluded.', 'EVENT_COMPLETED', 400);
      }

      // 3. Duplicate active registration check
      const existingActive = await Registration.findOne({
        student: user._id,
        event: event._id,
        status: 'active',
      }).session(session);

      if (existingActive) {
        throw new RegistrationError(
          'You already have an active registration for this event.',
          'ALREADY_REGISTERED',
          409
        );
      }

      // 4. Atomic conditional capacity increment
      // Update registeredCount only if registeredCount < capacity
      const capacityUpdate = await Event.findOneAndUpdate(
        {
          _id: event._id,
          status: 'published',
          $expr: { $lt: ['$registeredCount', '$capacity'] },
        },
        {
          $inc: { registeredCount: 1 },
        },
        {
          session,
          new: true,
        }
      );

      if (!capacityUpdate) {
        throw new RegistrationError(
          'This event has reached full capacity. No seats are available.',
          'EVENT_FULL',
          400
        );
      }

      // 5. Create new active registration record
      const registration = new Registration({
        student: user._id,
        event: event._id,
        status: 'active',
        registeredAt: new Date(),
      });

      await registration.save({ session });

      // 6. Generate cryptographically secure random token and create active Ticket atomically
      const token = crypto.randomBytes(32).toString('hex');
      const ticket = new Ticket({
        registration: registration._id,
        student: user._id,
        event: event._id,
        token,
        status: 'active',
        issuedAt: new Date(),
      });

      await ticket.save({ session });

      // 7. Commit transaction
      await session.commitTransaction();

      await registration.populate([
        { path: 'event', select: 'title category venue startDateTime endDateTime capacity registeredCount' },
        { path: 'student', select: 'name email' },
      ]);

      // Phase 10 In-App Notification Hook
      try {
        const notificationService = require('./notificationService');
        await notificationService.notifyRegistrationConfirmed(user._id, capacityUpdate);
      } catch (notifErr) {
        console.error('Failed to send registration confirmation notification:', notifErr.message);
      }

      return {
        registration,
        ticket,
        event: capacityUpdate,
      };
    } catch (error) {
      await session.abortTransaction();

      const isTransient =
        (typeof error.hasErrorLabel === 'function' && error.hasErrorLabel('TransientTransactionError')) ||
        error.code === 112 ||
        (error.message && error.message.includes('WriteConflict'));

      if (isTransient && attempt < maxRetries) {
        // Backoff slightly and retry transaction
        await new Promise((resolve) => setTimeout(resolve, attempt * 25));
        continue;
      }

      if (error.code === 11000) {
        // Partial unique index violation caught concurrently
        throw new RegistrationError(
          'You already have an active registration for this event.',
          'ALREADY_REGISTERED',
          409
        );
      }
      throw error;
    } finally {
      session.endSession();
    }
  }
};

/**
 * Cancel an active registration for the authenticated student.
 */
const cancelRegistration = async (eventId, user) => {
  if (user.role !== 'student') {
    throw new RegistrationError('Only students can cancel their registrations.', 'FORBIDDEN', 403);
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const event = await Event.findById(eventId).session(session);
      if (!event) {
        throw new RegistrationError('Event not found.', 'EVENT_NOT_FOUND', 404);
      }

      // Check if cancellation is allowed by event rules
      if (!event.allowCancellation) {
        throw new RegistrationError(
          'The organizer has disabled registration cancellation for this event.',
          'CANCELLATION_NOT_ALLOWED',
          400
        );
      }

      const now = new Date();
      if (event.cancellationDeadline && now > new Date(event.cancellationDeadline)) {
        throw new RegistrationError(
          'The cancellation deadline for this event has passed.',
          'CANCELLATION_DEADLINE_PASSED',
          400
        );
      }

      // Default cutoff is registration deadline
      if (!event.cancellationDeadline && now > new Date(event.registrationDeadline)) {
        throw new RegistrationError(
          'Registration has closed. Cancellation is no longer permitted.',
          'CANCELLATION_DEADLINE_PASSED',
          400
        );
      }

      // Find student's active registration
      const registration = await Registration.findOne({
        student: user._id,
        event: event._id,
        status: 'active',
      }).session(session);

      if (!registration) {
        throw new RegistrationError(
          'No active registration found to cancel.',
          'REGISTRATION_NOT_FOUND',
          404
        );
      }

      // Mark registration as cancelled
      registration.status = 'cancelled';
      registration.cancelledAt = new Date();
      await registration.save({ session });

      // Mark associated active ticket as cancelled
      const cancelledTicket = await Ticket.findOneAndUpdate(
        {
          registration: registration._id,
          status: 'active',
        },
        {
          status: 'cancelled',
          cancelledAt: new Date(),
        },
        { session, new: true }
      );

      // Decrement registeredCount (ensure non-negative)
      await Event.findByIdAndUpdate(
        event._id,
        { $inc: { registeredCount: -1 } },
        { session, new: true }
      );

      // Phase 9 Waitlist Promotion Trigger:
      // If eligible waitlisted students exist and registration is still open, promote earliest FIFO student in this transaction
      const waitlistService = require('./waitlistService');
      const promotionResult = await waitlistService.promoteWaitlistAttendees(
        event._id,
        session,
        { promotionReason: 'cancellation' }
      );

      const finalEvent = await Event.findById(event._id).session(session);

      await session.commitTransaction();

      // Phase 10 In-App Notification Hook
      try {
        const notificationService = require('./notificationService');
        await notificationService.notifyRegistrationCancelled(user._id, finalEvent);
        if (promotionResult && promotionResult.promotedStudents) {
          for (const p of promotionResult.promotedStudents) {
            await notificationService.notifyWaitlistPromoted(p.studentId, finalEvent);
          }
        }
      } catch (notifErr) {
        console.error('Failed to send registration/promotion notification:', notifErr.message);
      }

      return {
        registration,
        ticket: cancelledTicket,
        event: finalEvent,
        promoted: promotionResult,
      };
    } catch (error) {
      await session.abortTransaction();

      const isTransient =
        (typeof error.hasErrorLabel === 'function' && error.hasErrorLabel('TransientTransactionError')) ||
        error.code === 112 ||
        (error.message && error.message.includes('WriteConflict'));

      if (isTransient && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 25));
        continue;
      }

      throw error;
    } finally {
      session.endSession();
    }
  }
};

/**
 * Get registration details for the authenticated student for a specific event.
 */
const getMyRegistrationForEvent = async (eventId, user) => {
  const registration = await Registration.findOne({
    student: user._id,
    event: eventId,
    status: 'active',
  }).populate([
    {
      path: 'event',
      populate: { path: 'club', select: 'name category' },
    },
  ]);

  return registration;
};

/**
 * List all events registered by the authenticated student.
 */
const getMyEvents = async (user, queryParams = {}) => {
  const { page = 1, limit = 20, status = 'active' } = queryParams;

  const filter = {
    student: user._id,
  };

  if (status !== 'all') {
    filter.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [registrations, total] = await Promise.all([
    Registration.find(filter)
      .populate({
        path: 'event',
        populate: { path: 'club', select: 'name category' },
      })
      .sort({ registeredAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Registration.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);

  return {
    registrations,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

/**
 * Get attendees list for an event (Organizer/Admin only).
 * Organizers can access only events of clubs they manage.
 * Admins have platform-wide access.
 */
const getEventRegistrations = async (eventId, user, queryParams = {}) => {
  const event = await Event.findById(eventId).populate('club');
  if (!event) {
    throw new RegistrationError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  // Authorization check
  if (user.role === 'organizer') {
    const club = await Club.findById(event.club);
    const isAuthorized = club && club.organizers.some(
      (orgId) => orgId.toString() === user._id.toString()
    );

    if (!isAuthorized) {
      throw new RegistrationError(
        'You are not authorized to view registrations for this club event.',
        'FORBIDDEN',
        403
      );
    }
  } else if (user.role !== 'admin') {
    throw new RegistrationError('Access denied.', 'FORBIDDEN', 403);
  }

  const { page = 1, limit = 20, status = 'active' } = queryParams;

  const filter = { event: event._id };
  if (status !== 'all') {
    filter.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [registrations, total] = await Promise.all([
    Registration.find(filter)
      .populate('student', 'name email isActive')
      .sort({ registeredAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Registration.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);

  return {
    event: {
      _id: event._id,
      title: event.title,
      capacity: event.capacity,
      registeredCount: event.registeredCount,
      availableSeats: event.availableSeats,
      capacityStatus: event.capacityStatus,
    },
    registrations,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

module.exports = {
  RegistrationError,
  registerForEvent,
  cancelRegistration,
  getMyRegistrationForEvent,
  getMyEvents,
  getEventRegistrations,
};
