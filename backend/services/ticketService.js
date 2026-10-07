const Ticket = require('../models/Ticket');
const Club = require('../models/Club');
const Event = require('../models/Event');

class TicketError extends Error {
  constructor(message, code = 'TICKET_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'TicketError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Get paginated list of tickets for the authenticated student.
 */
const getMyTickets = async (user, queryParams = {}) => {
  if (user.role !== 'student') {
    throw new TicketError('Only students can view their tickets.', 'FORBIDDEN', 403);
  }

  const { page = 1, limit = 20, status = 'active' } = queryParams;

  const filter = { student: user._id };
  if (status !== 'all') {
    filter.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .populate({
        path: 'event',
        select: 'title category venue startDateTime endDateTime status bannerUrl club',
        populate: { path: 'club', select: 'name category' },
      })
      .populate('registration', 'status registeredAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Ticket.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);

  return {
    tickets,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

/**
 * Get ticket by its MongoDB ID with strict ownership and authorization checks.
 */
const getTicketById = async (ticketId, user) => {
  const ticket = await Ticket.findById(ticketId)
    .populate({
      path: 'event',
      select: 'title category venue startDateTime endDateTime status bannerUrl club',
      populate: { path: 'club', select: 'name category organizers' },
    })
    .populate('student', 'name email isActive')
    .populate('registration', 'status registeredAt cancelledAt');

  if (!ticket) {
    throw new TicketError('Ticket not found.', 'TICKET_NOT_FOUND', 404);
  }

  // Ownership verification
  if (user.role === 'student') {
    if (ticket.student._id.toString() !== user._id.toString()) {
      throw new TicketError('You are not authorized to view this ticket.', 'FORBIDDEN', 403);
    }
  } else if (user.role === 'organizer') {
    const club = ticket.event?.club;
    const isAssigned =
      club &&
      club.organizers &&
      club.organizers.some((orgId) => orgId.toString() === user._id.toString());
    if (!isAssigned) {
      throw new TicketError(
        'You are not authorized to view tickets for this club event.',
        'FORBIDDEN',
        403
      );
    }
  } else if (user.role !== 'admin') {
    throw new TicketError('Access denied.', 'FORBIDDEN', 403);
  }

  return ticket;
};

/**
 * Get active ticket for the authenticated student for a specific event.
 */
const getTicketForEvent = async (eventId, user) => {
  if (user.role !== 'student') {
    throw new TicketError('Only students can hold event tickets.', 'FORBIDDEN', 403);
  }

  const ticket = await Ticket.findOne({
    event: eventId,
    student: user._id,
    status: 'active',
  })
    .populate({
      path: 'event',
      select: 'title category venue startDateTime endDateTime status bannerUrl club',
      populate: { path: 'club', select: 'name category' },
    })
    .populate('student', 'name email')
    .populate('registration', 'status registeredAt');

  return ticket;
};

/**
 * Validate ticket token foundation (for future Phase 8 check-in verification).
 * Returns validity status and event/student context without modifying state.
 */
const validateTicketToken = async (token) => {
  const ticket = await Ticket.findOne({ token })
    .populate({
      path: 'event',
      select: 'title category venue startDateTime endDateTime status club',
      populate: { path: 'club', select: 'name category' },
    })
    .populate('student', 'name email isActive')
    .populate('registration', 'status registeredAt cancelledAt');

  if (!ticket) {
    throw new TicketError('Ticket token not found or invalid.', 'TICKET_NOT_FOUND', 404);
  }

  const isEventPublished = ticket.event?.status === 'published';
  const isRegistrationActive = ticket.registration?.status === 'active';
  const isTicketActive = ticket.status === 'active';
  const isStudentActive = ticket.student?.isActive !== false;

  const isValid = isTicketActive && isRegistrationActive && isEventPublished && isStudentActive;

  let reason = null;
  if (!isTicketActive) reason = `Ticket is ${ticket.status}`;
  else if (!isRegistrationActive) reason = 'Registration is cancelled';
  else if (!isEventPublished) reason = `Event is ${ticket.event?.status || 'unavailable'}`;
  else if (!isStudentActive) reason = 'Student account is deactivated';

  return {
    isValid,
    status: ticket.status,
    reason,
    ticket: {
      _id: ticket._id,
      token: ticket.token,
      status: ticket.status,
      issuedAt: ticket.issuedAt,
      cancelledAt: ticket.cancelledAt,
      event: ticket.event,
      student: {
        _id: ticket.student?._id,
        name: ticket.student?.name,
        email: ticket.student?.email,
      },
      registration: {
        _id: ticket.registration?._id,
        status: ticket.registration?.status,
        registeredAt: ticket.registration?.registeredAt,
      },
    },
  };
};

module.exports = {
  TicketError,
  getMyTickets,
  getTicketById,
  getTicketForEvent,
  validateTicketToken,
};
