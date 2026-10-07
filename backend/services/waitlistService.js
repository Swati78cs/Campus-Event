const mongoose = require('mongoose');
const crypto = require('crypto');
const Waitlist = require('../models/Waitlist');
const Event = require('../models/Event');
const Club = require('../models/Club');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');

class WaitlistError extends Error {
  constructor(message, code = 'WAITLIST_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'WaitlistError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Calculate dynamic FIFO waitlist position for a waiting entry.
 */
const calculateWaitlistPosition = async (eventId, entryId) => {
  const entry = await Waitlist.findById(entryId);
  if (!entry || entry.status !== 'waiting') return null;

  const aheadCount = await Waitlist.countDocuments({
    event: eventId,
    status: 'waiting',
    $or: [
      { joinedAt: { $lt: entry.joinedAt } },
      { joinedAt: entry.joinedAt, _id: { $lt: entry._id } },
    ],
  });

  return aheadCount + 1;
};

/**
 * Assert organizer or admin permissions for viewing/managing an event's waitlist.
 */
const assertWaitlistManagementAccess = async (event, user) => {
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
      throw new WaitlistError(
        'You are not authorized to manage the waitlist for this club event.',
        'FORBIDDEN',
        403
      );
    }
    return true;
  }

  throw new WaitlistError('Access denied: Organizer or Admin role required.', 'FORBIDDEN', 403);
};

/**
 * Join event waitlist when event is full.
 */
const joinWaitlist = async (eventId, user) => {
  if (user.role !== 'student') {
    throw new WaitlistError(
      'Only students can join event waitlists. Organizers and administrators cannot join.',
      'FORBIDDEN',
      403
    );
  }

  if (!user.isActive) {
    throw new WaitlistError('Your account is deactivated.', 'USER_INACTIVE', 403);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new WaitlistError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  if (event.status === 'draft') {
    throw new WaitlistError('Event is not published for registration.', 'EVENT_NOT_OPEN', 400);
  }

  if (event.status === 'cancelled') {
    throw new WaitlistError('This event has been cancelled.', 'EVENT_CANCELLED', 400);
  }

  if (new Date() > new Date(event.endDateTime)) {
    throw new WaitlistError('This event is completed.', 'EVENT_COMPLETED', 400);
  }

  if (event.status !== 'published') {
    throw new WaitlistError('Event is not available for registration or waitlist.', 'EVENT_NOT_OPEN', 400);
  }

  const now = new Date();
  if (now > new Date(event.registrationDeadline)) {
    throw new WaitlistError('Registration for this event has closed.', 'REGISTRATION_CLOSED', 400);
  }

  // Check if seats are available
  const availableSeats = event.capacity - (event.registeredCount || 0);
  if (availableSeats > 0) {
    throw new WaitlistError(
      'Seats are currently available for this event. Please register directly instead of joining the waitlist.',
      'SEATS_AVAILABLE',
      400,
      { availableSeats }
    );
  }

  // Check if student already has active registration
  const activeReg = await Registration.findOne({
    event: eventId,
    student: user._id,
    status: 'active',
  });
  if (activeReg) {
    throw new WaitlistError(
      'You already have an active registration for this event.',
      'ALREADY_REGISTERED',
      400
    );
  }

  // Check if student already has active waitlist entry
  const activeWaitlist = await Waitlist.findOne({
    event: eventId,
    student: user._id,
    status: 'waiting',
  });
  if (activeWaitlist) {
    throw new WaitlistError(
      'You are already on the waitlist for this event.',
      'ALREADY_WAITLISTED',
      400
    );
  }

  try {
    const entry = await Waitlist.create({
      event: eventId,
      student: user._id,
      status: 'waiting',
      joinedAt: new Date(),
    });

    const position = await calculateWaitlistPosition(eventId, entry._id);

    return {
      waitlist: entry,
      position,
      event: {
        _id: event._id,
        title: event.title,
        capacity: event.capacity,
        registeredCount: event.registeredCount,
      },
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new WaitlistError(
        'You are already on the waitlist for this event.',
        'ALREADY_WAITLISTED',
        400
      );
    }
    throw error;
  }
};

/**
 * Get current authenticated student's waitlist status for a specific event.
 */
const getMyWaitlistStatus = async (eventId, user) => {
  if (user.role !== 'student') {
    throw new WaitlistError('Only students can check their waitlist status.', 'FORBIDDEN', 403);
  }

  const activeEntry = await Waitlist.findOne({
    event: eventId,
    student: user._id,
    status: 'waiting',
  });

  if (activeEntry) {
    const position = await calculateWaitlistPosition(eventId, activeEntry._id);
    const totalWaiting = await Waitlist.countDocuments({ event: eventId, status: 'waiting' });
    return {
      status: 'waiting',
      isWaitlisted: true,
      entry: activeEntry,
      position,
      totalWaiting,
    };
  }

  // Check latest historical entry
  const latestEntry = await Waitlist.findOne({
    event: eventId,
    student: user._id,
  }).sort({ createdAt: -1 });

  if (latestEntry && latestEntry.status === 'promoted') {
    const activeReg = await Registration.findOne({
      event: eventId,
      student: user._id,
      status: 'active',
    });
    return {
      status: 'promoted',
      isWaitlisted: false,
      entry: latestEntry,
      registrationId: activeReg?._id || null,
    };
  }

  if (latestEntry && latestEntry.status === 'removed') {
    return {
      status: 'removed',
      isWaitlisted: false,
      entry: latestEntry,
    };
  }

  if (latestEntry && latestEntry.status === 'cancelled') {
    return {
      status: 'cancelled',
      isWaitlisted: false,
      entry: latestEntry,
    };
  }

  return {
    status: 'none',
    isWaitlisted: false,
    entry: null,
  };
};

/**
 * Student leaves waitlist for an event.
 */
const leaveWaitlist = async (eventId, user) => {
  if (user.role !== 'student') {
    throw new WaitlistError('Only students can leave waitlists.', 'FORBIDDEN', 403);
  }

  const entry = await Waitlist.findOne({
    event: eventId,
    student: user._id,
    status: 'waiting',
  });

  if (!entry) {
    throw new WaitlistError('No active waitlist entry found for this event.', 'WAITLIST_NOT_FOUND', 404);
  }

  entry.status = 'removed';
  entry.removedAt = new Date();
  await entry.save();

  return {
    waitlist: entry,
    message: 'Successfully removed from the waitlist.',
  };
};

/**
 * Get paginated list of events for which the student is waitlisted.
 */
const getMyWaitlistEvents = async (user, queryParams = {}) => {
  if (user.role !== 'student') {
    throw new WaitlistError('Only students can view their waitlist entries.', 'FORBIDDEN', 403);
  }

  const { page = 1, limit = 20, status = 'waiting' } = queryParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = { student: user._id };
  if (status !== 'all') {
    filter.status = status;
  }

  const [entries, total] = await Promise.all([
    Waitlist.find(filter)
      .populate({
        path: 'event',
        select: 'title description category venue startDateTime endDateTime status capacity registeredCount bannerUrl club',
        populate: { path: 'club', select: 'name category' },
      })
      .sort({ joinedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Waitlist.countDocuments(filter),
  ]);

  const entriesWithPosition = await Promise.all(
    entries.map(async (entry) => {
      let position = null;
      if (entry.status === 'waiting') {
        position = await calculateWaitlistPosition(entry.event?._id, entry._id);
      }
      return {
        ...entry.toObject(),
        position,
      };
    })
  );

  const totalPages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);

  return {
    entries: entriesWithPosition,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

/**
 * Get waitlist entries for an event (Organizer / Admin access).
 */
const getEventWaitlist = async (eventId, user, queryParams = {}) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new WaitlistError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  await assertWaitlistManagementAccess(event, user);

  const { page = 1, limit = 50, status = 'all' } = queryParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const filter = { event: eventId };
  if (status !== 'all') {
    filter.status = status;
  }

  const [entries, total, activeWaitingCount] = await Promise.all([
    Waitlist.find(filter)
      .populate('student', 'name email isActive')
      .sort({ joinedAt: 1, _id: 1 })
      .skip(skip)
      .limit(limitNum),
    Waitlist.countDocuments(filter),
    Waitlist.countDocuments({ event: eventId, status: 'waiting' }),
  ]);

  const entriesWithPosition = await Promise.all(
    entries.map(async (entry) => {
      let position = null;
      if (entry.status === 'waiting') {
        position = await calculateWaitlistPosition(eventId, entry._id);
      }
      return {
        ...entry.toObject(),
        position,
      };
    })
  );

  const totalPages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);

  return {
    entries: entriesWithPosition,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
    activeWaitingCount,
    event: {
      _id: event._id,
      title: event.title,
      capacity: event.capacity,
      registeredCount: event.registeredCount,
      status: event.status,
    },
  };
};

/**
 * Organizer / Admin removes a waiting student from the waitlist.
 */
const removeStudentFromWaitlist = async (eventId, studentId, user) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new WaitlistError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  await assertWaitlistManagementAccess(event, user);

  const entry = await Waitlist.findOne({
    event: eventId,
    student: studentId,
    status: 'waiting',
  });

  if (!entry) {
    throw new WaitlistError(
      'Active waitlist entry not found for this student.',
      'WAITLIST_NOT_FOUND',
      404
    );
  }

  entry.status = 'removed';
  entry.removedAt = new Date();
  await entry.save();

  return {
    waitlist: entry,
    message: 'Student successfully removed from waitlist.',
  };
};

/**
 * Automatic Promotion Function: Promotes earliest eligible FIFO waitlisted students into available seats.
 * Can execute inside an existing transaction session or initiate its own transaction.
 */
const promoteWaitlistAttendees = async (eventId, externalSession = null, options = {}) => {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = externalSession || (await mongoose.startSession());
    if (!externalSession) session.startTransaction();

    try {
      const event = await Event.findById(eventId).session(session);
      if (!event || event.status !== 'published') {
        if (!externalSession) {
          await session.commitTransaction();
          session.endSession();
        }
        return { promotedCount: 0, promotedStudents: [] };
      }

      const now = new Date();
      if (now > new Date(event.registrationDeadline)) {
        if (!externalSession) {
          await session.commitTransaction();
          session.endSession();
        }
        return { promotedCount: 0, promotedStudents: [] };
      }

      let availableSeats = event.capacity - (event.registeredCount || 0);
      if (availableSeats <= 0) {
        if (!externalSession) {
          await session.commitTransaction();
          session.endSession();
        }
        return { promotedCount: 0, promotedStudents: [] };
      }

      const promotedStudents = [];
      const skippedStudentIds = [];

      while (availableSeats > 0) {
        // Find earliest waiting candidate in deterministic FIFO order
        const candidateEntry = await Waitlist.findOne({
          event: eventId,
          status: 'waiting',
          student: { $nin: skippedStudentIds },
        })
          .sort({ joinedAt: 1, _id: 1 })
          .session(session);

        if (!candidateEntry) {
          break;
        }

        // Check if student account is active
        const student = await User.findById(candidateEntry.student).session(session);
        if (!student || !student.isActive) {
          // Inactive student is skipped, retaining their historical record without promotion
          skippedStudentIds.push(candidateEntry.student);
          continue;
        }

        // Check if student already has active registration
        const existingReg = await Registration.findOne({
          event: eventId,
          student: candidateEntry.student,
          status: 'active',
        }).session(session);

        if (existingReg) {
          // Ineligible: already registered. Clean up waitlist entry to promoted
          candidateEntry.status = 'promoted';
          candidateEntry.promotedAt = new Date();
          candidateEntry.promotionReason = options.promotionReason || 'cancellation';
          await candidateEntry.save({ session });
          continue;
        }

        // 1. Create active Registration
        const [newReg] = await Registration.create(
          [
            {
              event: eventId,
              student: candidateEntry.student,
              status: 'active',
              registeredAt: new Date(),
            },
          ],
          { session }
        );

        // 2. Increment Event.registeredCount
        await Event.findByIdAndUpdate(
          eventId,
          { $inc: { registeredCount: 1 } },
          { session }
        );
        event.registeredCount += 1;

        // 3. Create fresh Ticket using Phase 6 cryptographic token generator
        const token = crypto.randomBytes(32).toString('hex');
        const [newTicket] = await Ticket.create(
          [
            {
              token,
              event: eventId,
              student: candidateEntry.student,
              registration: newReg._id,
              status: 'active',
              issuedAt: new Date(),
            },
          ],
          { session }
        );

        // 4. Mark Waitlist entry as promoted
        candidateEntry.status = 'promoted';
        candidateEntry.promotedAt = new Date();
        candidateEntry.promotionReason = options.promotionReason || 'cancellation';
        await candidateEntry.save({ session });

        promotedStudents.push({
          studentId: candidateEntry.student,
          registrationId: newReg._id,
          ticketId: newTicket._id,
          ticketToken: token,
        });

        availableSeats = event.capacity - event.registeredCount;
      }

      if (!externalSession) {
        await session.commitTransaction();
        session.endSession();

        // Phase 10 In-App Notification Hook for standalone promotions (e.g. capacity increase)
        try {
          const notificationService = require('./notificationService');
          for (const p of promotedStudents) {
            await notificationService.notifyWaitlistPromoted(p.studentId, event);
          }
        } catch (notifErr) {
          console.error('Failed to send waitlist promotion notifications:', notifErr.message);
        }
      }

      return {
        promotedCount: promotedStudents.length,
        promotedStudents,
      };
    } catch (error) {
      if (!externalSession) {
        await session.abortTransaction();
        session.endSession();
        const isTransient =
          (typeof error.hasErrorLabel === 'function' && error.hasErrorLabel('TransientTransactionError')) ||
          error.code === 112 ||
          (error.message && error.message.includes('WriteConflict'));
        if (isTransient && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 50));
          continue;
        }
      }
      throw error;
    }
  }
};

module.exports = {
  WaitlistError,
  calculateWaitlistPosition,
  assertWaitlistManagementAccess,
  joinWaitlist,
  getMyWaitlistStatus,
  leaveWaitlist,
  getMyWaitlistEvents,
  getEventWaitlist,
  removeStudentFromWaitlist,
  promoteWaitlistAttendees,
};
