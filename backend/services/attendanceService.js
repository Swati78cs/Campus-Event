const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Club = require('../models/Club');
const User = require('../models/User');
const Registration = require('../models/Registration');
const VolunteerAssignment = require('../models/VolunteerAssignment');

class AttendanceError extends Error {
  constructor(message, code = 'ATTENDANCE_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'AttendanceError';
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
 * Check if the user is authorized to perform check-in and view attendance:
 * - Admin (global)
 * - Club Organizer (for the event's club)
 * - Assigned Volunteer (active assignment for this specific event)
 */
const assertCheckInPermission = async (event, user) => {
  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'organizer') {
    const club = await Club.findById(event.club);
    const isClubOrganizer =
      club &&
      club.organizers &&
      club.organizers.some((orgId) => orgId.toString() === user._id.toString());
    if (isClubOrganizer) {
      return true;
    }
  }

  // Check if assigned as active volunteer for this event
  const isVolunteer = await VolunteerAssignment.findOne({
    event: event._id,
    user: user._id,
    status: 'active',
  });

  if (isVolunteer) {
    return true;
  }

  throw new AttendanceError(
    'You are not authorized to manage attendance or perform check-in for this event.',
    'UNAUTHORIZED_CHECK_IN',
    403
  );
};

/**
 * Validate that the event is published and within the valid check-in window.
 */
const assertCheckInWindow = (event) => {
  if (event.status !== 'published') {
    throw new AttendanceError(
      'Check-in not allowed for this event status',
      'EVENT_NOT_ACTIVE',
      400,
      { eventStatus: event.status }
    );
  }

  const now = new Date();
  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);

  if (now < start) {
    throw new AttendanceError(
      `Check-in has not started yet. Event starts at ${event.startDateTime.toISOString()}`,
      'CHECK_IN_NOT_STARTED',
      400,
      { startDateTime: event.startDateTime }
    );
  }

  if (now > end) {
    throw new AttendanceError(
      `Check-in is closed. Event ended at ${event.endDateTime.toISOString()}`,
      'CHECK_IN_CLOSED',
      400,
      { endDateTime: event.endDateTime }
    );
  }
};

/**
 * Check-in via QR ticket token.
 */
const checkInByQr = async (eventId, token, currentUser) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AttendanceError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  // 1. Authorization check
  await assertCheckInPermission(event, currentUser);

  // 2. Check-in window & event status
  assertCheckInWindow(event);

  // 3. Find ticket by token
  const ticket = await Ticket.findOne({ token })
    .populate('student', 'name email isActive')
    .populate('registration', 'status');

  if (!ticket) {
    throw new AttendanceError('Invalid ticket token.', 'INVALID_TICKET', 400);
  }

  // 4. Ticket event match check
  if (ticket.event.toString() !== eventId.toString()) {
    throw new AttendanceError('Ticket is for a different event.', 'TICKET_EVENT_MISMATCH', 400);
  }

  // 5. Student active check
  if (!ticket.student || !ticket.student.isActive) {
    throw new AttendanceError('Student account is inactive.', 'STUDENT_INACTIVE', 400);
  }

  // 6. Registration active check
  if (!ticket.registration || ticket.registration.status !== 'active') {
    throw new AttendanceError('Registration is cancelled.', 'REGISTRATION_CANCELLED', 400);
  }

  // 7. Check ticket status & existing attendance
  if (ticket.status === 'cancelled') {
    throw new AttendanceError('Ticket has been cancelled.', 'TICKET_CANCELLED', 400);
  }

  const existingAttendance = await Attendance.findOne({
    event: eventId,
    student: ticket.student._id,
  }).populate('checkedInBy', 'name email');

  if (existingAttendance) {
    throw new AttendanceError('Student already checked in.', 'ALREADY_CHECKED_IN', 400, {
      existingAttendance,
    });
  }

  if (ticket.status === 'used') {
    throw new AttendanceError('Ticket has already been used.', 'TICKET_ALREADY_USED', 400);
  }

  // 8. Atomic transaction for Ticket update and Attendance record creation
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Atomically mark ticket as used
      const updatedTicket = await Ticket.findOneAndUpdate(
        { _id: ticket._id, status: 'active' },
        { status: 'used' },
        { session, new: true }
      );

      if (!updatedTicket) {
        const curTicket = await Ticket.findById(ticket._id).session(session);
        if (curTicket && curTicket.status === 'used') {
          throw new AttendanceError('Ticket has already been used.', 'TICKET_ALREADY_USED', 400);
        }
        throw new AttendanceError('Ticket has been cancelled.', 'TICKET_CANCELLED', 400);
      }

      // Create attendance record
      const [attendance] = await Attendance.create(
        [
          {
            event: eventId,
            student: ticket.student._id,
            ticket: ticket._id,
            checkedInAt: new Date(),
            checkedInBy: currentUser._id,
            method: 'qr',
            status: 'checked_in',
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      const populatedAttendance = await Attendance.findById(attendance._id)
        .populate('student', 'name email')
        .populate('checkedInBy', 'name email')
        .populate('ticket', 'token status');

      return {
        attendance: populatedAttendance,
        student: {
          _id: ticket.student._id,
          name: ticket.student.name,
          email: ticket.student.email,
        },
        event: {
          _id: event._id,
          title: event.title,
          venue: event.venue,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      if (error.code === 112 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 50));
        continue;
      }

      if (error.code === 11000) {
        const dup = await Attendance.findOne({
          event: eventId,
          student: ticket.student._id,
        }).populate('checkedInBy', 'name email');
        throw new AttendanceError('Student already checked in.', 'ALREADY_CHECKED_IN', 400, {
          existingAttendance: dup,
        });
      }

      throw error;
    }
  }
};

/**
 * Manual check-in by Student ID.
 */
const checkInManual = async (eventId, studentId, currentUser) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AttendanceError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  // 1. Authorization check
  await assertCheckInPermission(event, currentUser);

  // 2. Check-in window & event status
  assertCheckInWindow(event);

  // 3. Student existence & active check
  const student = await User.findById(studentId);
  if (!student || !student.isActive) {
    throw new AttendanceError('Student account is inactive.', 'STUDENT_INACTIVE', 400);
  }

  // 4. Duplicate attendance check
  const existingAttendance = await Attendance.findOne({
    event: eventId,
    student: studentId,
  }).populate('checkedInBy', 'name email');

  if (existingAttendance) {
    throw new AttendanceError('Student already checked in.', 'ALREADY_CHECKED_IN', 400, {
      existingAttendance,
    });
  }

  // 5. Active Registration check
  const registration = await Registration.findOne({
    event: eventId,
    student: studentId,
  });

  if (!registration || registration.status !== 'active') {
    if (registration && registration.status === 'cancelled') {
      throw new AttendanceError('Registration is cancelled.', 'REGISTRATION_CANCELLED', 400);
    }
    throw new AttendanceError('Student is not registered for this event.', 'REGISTRATION_NOT_FOUND', 404);
  }

  // 6. Active Ticket check
  const ticket = await Ticket.findOne({
    event: eventId,
    student: studentId,
    registration: registration._id,
  });

  if (!ticket) {
    throw new AttendanceError('Invalid ticket.', 'INVALID_TICKET', 404);
  }

  if (ticket.status === 'cancelled') {
    throw new AttendanceError('Ticket has been cancelled.', 'TICKET_CANCELLED', 400);
  }

  if (ticket.status === 'used') {
    throw new AttendanceError('Ticket has already been used.', 'TICKET_ALREADY_USED', 400);
  }

  // 7. Atomic transaction
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedTicket = await Ticket.findOneAndUpdate(
        { _id: ticket._id, status: 'active' },
        { status: 'used' },
        { session, new: true }
      );

      if (!updatedTicket) {
        throw new AttendanceError('Ticket has already been used.', 'TICKET_ALREADY_USED', 400);
      }

      const [attendance] = await Attendance.create(
        [
          {
            event: eventId,
            student: studentId,
            ticket: ticket._id,
            checkedInAt: new Date(),
            checkedInBy: currentUser._id,
            method: 'manual',
            status: 'checked_in',
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      const populatedAttendance = await Attendance.findById(attendance._id)
        .populate('student', 'name email')
        .populate('checkedInBy', 'name email')
        .populate('ticket', 'token status');

      return {
        attendance: populatedAttendance,
        student: {
          _id: student._id,
          name: student.name,
          email: student.email,
        },
        event: {
          _id: event._id,
          title: event.title,
          venue: event.venue,
        },
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      if (error.code === 112 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 50));
        continue;
      }

      if (error.code === 11000) {
        const dup = await Attendance.findOne({
          event: eventId,
          student: studentId,
        }).populate('checkedInBy', 'name email');
        throw new AttendanceError('Student already checked in.', 'ALREADY_CHECKED_IN', 400, {
          existingAttendance: dup,
        });
      }

      throw error;
    }
  }
};

/**
 * Admin override check-in with reason.
 */
const overrideAttendance = async (eventId, studentId, overrideReason, currentUser) => {
  if (currentUser.role !== 'admin') {
    throw new AttendanceError('Only administrators can perform attendance override.', 'FORBIDDEN', 403);
  }

  if (!overrideReason || overrideReason.trim().length < 3) {
    throw new AttendanceError(
      'A valid override reason (minimum 3 characters) is required.',
      'INVALID_OVERRIDE_REASON',
      400
    );
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AttendanceError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  const student = await User.findById(studentId);
  if (!student || !student.isActive) {
    throw new AttendanceError('Student account is inactive.', 'STUDENT_INACTIVE', 400);
  }

  const existingAttendance = await Attendance.findOne({
    event: eventId,
    student: studentId,
  }).populate('checkedInBy', 'name email');

  if (existingAttendance) {
    throw new AttendanceError('Student already checked in.', 'ALREADY_CHECKED_IN', 400, {
      existingAttendance,
    });
  }

  // Find ticket if any exists
  const ticket = await Ticket.findOne({
    event: eventId,
    student: studentId,
  }).sort({ createdAt: -1 });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (ticket && ticket.status === 'active') {
      ticket.status = 'used';
      await ticket.save({ session });
    }

    const [attendance] = await Attendance.create(
      [
        {
          event: eventId,
          student: studentId,
          ticket: ticket ? ticket._id : undefined,
          checkedInAt: new Date(),
          checkedInBy: currentUser._id,
          method: 'admin_override',
          status: 'overridden',
          overrideReason: overrideReason.trim(),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const populatedAttendance = await Attendance.findById(attendance._id)
      .populate('student', 'name email')
      .populate('checkedInBy', 'name email')
      .populate('ticket', 'token status');

    return {
      attendance: populatedAttendance,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
      },
      event: {
        _id: event._id,
        title: event.title,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error.code === 11000) {
      const dup = await Attendance.findOne({
        event: eventId,
        student: studentId,
      }).populate('checkedInBy', 'name email');
      throw new AttendanceError('Student already checked in.', 'ALREADY_CHECKED_IN', 400, {
        existingAttendance: dup,
      });
    }

    throw error;
  }
};

/**
 * Get attendance records for an event (staff / volunteer access).
 */
const getEventAttendance = async (eventId, currentUser, queryParams = {}) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AttendanceError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  await assertCheckInPermission(event, currentUser);

  const { page = 1, limit = 50, search = '', method, status } = queryParams;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const filter = { event: eventId };
  if (method) filter.method = method;
  if (status) filter.status = status;

  if (search && search.trim()) {
    const safeRegex = new RegExp(escapeRegex(search.trim()), 'i');
    const matchedUsers = await User.find({
      $or: [{ name: safeRegex }, { email: safeRegex }],
    }).select('_id');
    filter.student = { $in: matchedUsers.map((u) => u._id) };
  }

  const [records, total, totalRegistered, totalCheckedIn] = await Promise.all([
    Attendance.find(filter)
      .populate('student', 'name email')
      .populate('checkedInBy', 'name email')
      .populate('ticket', 'token status')
      .sort({ checkedInAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Attendance.countDocuments(filter),
    Registration.countDocuments({ event: eventId, status: 'active' }),
    Attendance.countDocuments({ event: eventId }),
  ]);

  const totalPages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);
  const checkInRate =
    totalRegistered > 0 ? parseFloat(((totalCheckedIn / totalRegistered) * 100).toFixed(1)) : 0;

  return {
    records,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
    stats: {
      totalRegistered,
      totalCheckedIn,
      checkInRate,
    },
  };
};

/**
 * Get attendance stats for an event.
 */
const getAttendanceStats = async (eventId, currentUser) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AttendanceError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  await assertCheckInPermission(event, currentUser);

  const [
    totalRegistered,
    totalCheckedIn,
    qrCount,
    manualCount,
    overrideCount,
    recentCheckIns,
  ] = await Promise.all([
    Registration.countDocuments({ event: eventId, status: 'active' }),
    Attendance.countDocuments({ event: eventId }),
    Attendance.countDocuments({ event: eventId, method: 'qr' }),
    Attendance.countDocuments({ event: eventId, method: 'manual' }),
    Attendance.countDocuments({ event: eventId, method: 'admin_override' }),
    Attendance.find({ event: eventId })
      .populate('student', 'name email')
      .populate('checkedInBy', 'name email')
      .populate('ticket', 'token status')
      .sort({ checkedInAt: -1 })
      .limit(10),
  ]);

  const checkInRate =
    totalRegistered > 0 ? parseFloat(((totalCheckedIn / totalRegistered) * 100).toFixed(1)) : 0;

  return {
    totalRegistered,
    totalCheckedIn,
    checkInRate,
    byMethod: {
      qr: qrCount,
      manual: manualCount,
      admin_override: overrideCount,
    },
    recentCheckIns,
  };
};

/**
 * Search registered attendees for manual check-in.
 */
const searchRegisteredAttendees = async (eventId, currentUser, queryParams = {}) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AttendanceError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  await assertCheckInPermission(event, currentUser);

  const { search = '', limit = 20 } = queryParams;
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  // Find active registrations
  const regQuery = { event: eventId, status: 'active' };
  if (search && search.trim()) {
    const safeRegex = new RegExp(escapeRegex(search.trim()), 'i');
    const matchedUsers = await User.find({
      $or: [{ name: safeRegex }, { email: safeRegex }],
    }).select('_id');
    regQuery.student = { $in: matchedUsers.map((u) => u._id) };
  }

  const registrations = await Registration.find(regQuery)
    .populate('student', 'name email isActive')
    .limit(limitNum);

  const studentIds = registrations.map((r) => r.student?._id).filter(Boolean);

  const [tickets, attendances] = await Promise.all([
    Ticket.find({ event: eventId, student: { $in: studentIds } }),
    Attendance.find({ event: eventId, student: { $in: studentIds } }).populate('checkedInBy', 'name email'),
  ]);

  const ticketMap = new Map();
  tickets.forEach((t) => ticketMap.set(t.student.toString(), t));

  const attendanceMap = new Map();
  attendances.forEach((a) => attendanceMap.set(a.student.toString(), a));

  const results = registrations.map((reg) => {
    const student = reg.student;
    const sId = student?._id?.toString();
    const ticket = ticketMap.get(sId);
    const attendance = attendanceMap.get(sId);

    return {
      registrationId: reg._id,
      registeredAt: reg.registeredAt,
      student: {
        _id: student?._id,
        name: student?.name,
        email: student?.email,
        isActive: student?.isActive,
      },
      ticket: ticket
        ? {
            _id: ticket._id,
            token: ticket.token,
            status: ticket.status,
          }
        : null,
      isCheckedIn: Boolean(attendance),
      attendance: attendance
        ? {
            _id: attendance._id,
            checkedInAt: attendance.checkedInAt,
            checkedInBy: attendance.checkedInBy,
            method: attendance.method,
            status: attendance.status,
            overrideReason: attendance.overrideReason,
          }
        : null,
    };
  });

  return results;
};

module.exports = {
  AttendanceError,
  assertCheckInPermission,
  assertCheckInWindow,
  checkInByQr,
  checkInManual,
  overrideAttendance,
  getEventAttendance,
  getAttendanceStats,
  searchRegisteredAttendees,
};
