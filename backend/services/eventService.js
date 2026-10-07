const mongoose = require('mongoose');
const Event = require('../models/Event');
const Club = require('../models/Club');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');
const Waitlist = require('../models/Waitlist');

class EventError extends Error {
  constructor(message, code = 'EVENT_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'EventError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Verify user authorization to manage a club's events.
 * Admins have global permission. Organizers must be in club.organizers.
 */
const assertClubOwnership = async (clubId, user) => {
  if (user.role === 'admin') {
    const club = await Club.findById(clubId);
    if (!club) {
      throw new EventError('Club not found.', 'CLUB_NOT_FOUND', 404);
    }
    if (!club.isActive) {
      throw new EventError('Cannot create events for an inactive club.', 'CLUB_INACTIVE', 400);
    }
    return club;
  }

  if (user.role === 'organizer') {
    const club = await Club.findById(clubId);
    if (!club) {
      throw new EventError('Club not found.', 'CLUB_NOT_FOUND', 404);
    }

    if (!club.isActive) {
      throw new EventError('Cannot create events for an inactive club.', 'CLUB_INACTIVE', 400);
    }

    const isAuthorized = club.organizers.some(
      (orgId) => orgId.toString() === user._id.toString()
    );

    if (!isAuthorized) {
      throw new EventError(
        'You are not authorized to manage events for this club.',
        'FORBIDDEN',
        403
      );
    }

    return club;
  }

  throw new EventError('Students cannot manage events.', 'FORBIDDEN', 403);
};

/**
 * Verify user authorization for a specific event.
 */
const assertEventOwnership = async (event, user) => {
  if (user.role === 'admin') {
    return true;
  }

  if (user.role === 'organizer') {
    const club = await Club.findById(event.club);
    if (!club) {
      throw new EventError('Associated club not found.', 'CLUB_NOT_FOUND', 404);
    }

    const isAuthorized = club.organizers.some(
      (orgId) => orgId.toString() === user._id.toString()
    );

    if (!isAuthorized) {
      throw new EventError(
        'You are not authorized to manage this event.',
        'FORBIDDEN',
        403
      );
    }

    return true;
  }

  throw new EventError('Access denied.', 'FORBIDDEN', 403);
};

/**
 * Create a new event.
 */
const createEvent = async (eventData, user) => {
  await assertClubOwnership(eventData.clubId, user);

  const event = await Event.create({
    title: eventData.title.trim(),
    description: eventData.description.trim(),
    club: eventData.clubId,
    createdBy: user._id,
    category: eventData.category,
    startDateTime: new Date(eventData.startDateTime),
    endDateTime: new Date(eventData.endDateTime),
    venue: eventData.venue.trim(),
    capacity: eventData.capacity,
    registrationDeadline: new Date(eventData.registrationDeadline),
    bannerUrl: eventData.bannerUrl || '',
    allowCancellation: eventData.allowCancellation !== undefined ? Boolean(eventData.allowCancellation) : true,
    cancellationDeadline: eventData.cancellationDeadline ? new Date(eventData.cancellationDeadline) : null,
    certificateEnabled: Boolean(eventData.certificateEnabled || false),
    status: eventData.status || 'draft',
  });

  return await event.populate([
    { path: 'club', select: 'name category' },
    { path: 'createdBy', select: 'name email role' },
  ]);
};

/**
 * Retrieve a single event by ID.
 */
const getEventById = async (eventId) => {
  const event = await Event.findById(eventId).populate([
    { path: 'club', select: 'name category organizers isActive' },
    { path: 'createdBy', select: 'name email' },
  ]);

  if (!event) {
    throw new EventError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  return event;
};

/**
 * Retrieve authorized events for the user.
 * Admin sees all events. Organizers see events of their assigned clubs.
 */
const getAuthorizedEvents = async (user) => {
  if (user.role === 'admin') {
    return await Event.find({})
      .populate('club', 'name category')
      .populate('createdBy', 'name email')
      .sort({ startDateTime: 1 });
  }

  if (user.role === 'organizer') {
    // Find clubs where organizer is assigned
    const assignedClubs = await Club.find({ organizers: user._id });
    const clubIds = assignedClubs.map((c) => c._id);

    return await Event.find({ club: { $in: clubIds } })
      .populate('club', 'name category')
      .populate('createdBy', 'name email')
      .sort({ startDateTime: 1 });
  }

  return [];
};

/**
 * Edit an existing event.
 */
const updateEvent = async (eventId, updateData, user) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new EventError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  await assertEventOwnership(event, user);

  if (event.status === 'cancelled') {
    throw new EventError('Cannot edit a cancelled event.', 'EVENT_CANCELLED', 400);
  }

  // Record original values before updates for Phase 10 notifications
  const originalVenue = event.venue;
  const originalStart = event.startDateTime ? new Date(event.startDateTime).getTime() : null;
  const originalEnd = event.endDateTime ? new Date(event.endDateTime).getTime() : null;

  // Handle updates
  if (updateData.title !== undefined) event.title = updateData.title.trim();
  if (updateData.description !== undefined) event.description = updateData.description.trim();
  if (updateData.category !== undefined) event.category = updateData.category;
  if (updateData.venue !== undefined) event.venue = updateData.venue.trim();
  let capacityIncreased = false;
  // Capacity cannot be reduced below current registeredCount
  if (updateData.capacity !== undefined) {
    if (updateData.capacity < (event.registeredCount || 0)) {
      throw new EventError(
        `Cannot reduce capacity to ${updateData.capacity}. There are already ${event.registeredCount} active registrations.`,
        'CAPACITY_BELOW_REGISTERED',
        400,
        { registeredCount: event.registeredCount, requestedCapacity: updateData.capacity }
      );
    }
    if (updateData.capacity > event.capacity) {
      capacityIncreased = true;
    }
    event.capacity = updateData.capacity;
  }
  if (updateData.bannerUrl !== undefined) event.bannerUrl = updateData.bannerUrl.trim();
  if (updateData.allowCancellation !== undefined) event.allowCancellation = Boolean(updateData.allowCancellation);
  if (updateData.cancellationDeadline !== undefined) {
    event.cancellationDeadline = updateData.cancellationDeadline ? new Date(updateData.cancellationDeadline) : null;
  }
  if (updateData.certificateEnabled !== undefined) {
    event.certificateEnabled = Boolean(updateData.certificateEnabled);
  }

  const newStart = updateData.startDateTime ? new Date(updateData.startDateTime) : event.startDateTime;
  const newEnd = updateData.endDateTime ? new Date(updateData.endDateTime) : event.endDateTime;
  const newDeadline = updateData.registrationDeadline
    ? new Date(updateData.registrationDeadline)
    : event.registrationDeadline;

  if (newEnd <= newStart) {
    throw new EventError('End date and time must be after start date and time.', 'INVALID_DATES', 400);
  }

  if (newDeadline > newStart) {
    throw new EventError(
      'Registration deadline cannot be after the event start time.',
      'INVALID_DEADLINE',
      400
    );
  }

  event.startDateTime = newStart;
  event.endDateTime = newEnd;
  event.registrationDeadline = newDeadline;

  await event.save();

  // Phase 10 In-App Notification Hooks (for published events)
  if (event.status === 'published') {
    const notificationService = require('./notificationService');
    const newStartTime = new Date(event.startDateTime).getTime();
    const newEndTime = new Date(event.endDateTime).getTime();

    if (originalStart !== newStartTime || originalEnd !== newEndTime) {
      try {
        await notificationService.notifyEventDateChanged(
          event,
          originalStart,
          originalEnd,
          event.startDateTime,
          event.endDateTime
        );
      } catch (err) {
        console.error('Failed to send date change notification:', err.message);
      }
    }

    if (originalVenue && event.venue && originalVenue !== event.venue) {
      try {
        await notificationService.notifyEventVenueChanged(event, originalVenue, event.venue);
      } catch (err) {
        console.error('Failed to send venue change notification:', err.message);
      }
    }
  }

  // Phase 9: If capacity was increased for an active published event, promote waitlisted attendees
  if (capacityIncreased && event.status === 'published') {
    const waitlistService = require('./waitlistService');
    await waitlistService.promoteWaitlistAttendees(event._id, null, {
      promotionReason: 'capacity_increase',
    });
  }
  return await event.populate([
    { path: 'club', select: 'name category' },
    { path: 'createdBy', select: 'name email' },
  ]);
};

/**
 * Publish a draft event.
 */
const publishEvent = async (eventId, user) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new EventError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  await assertEventOwnership(event, user);

  if (event.status === 'cancelled') {
    throw new EventError('Cannot publish a cancelled event.', 'EVENT_CANCELLED', 400);
  }

  if (event.status === 'published') {
    throw new EventError('This event is already published.', 'ALREADY_PUBLISHED', 400);
  }

  // Ensure registration deadline is in the future
  if (new Date(event.registrationDeadline) <= new Date()) {
    throw new EventError(
      'Cannot publish an event with an expired registration deadline. Please update the deadline first.',
      'DEADLINE_EXPIRED',
      400
    );
  }

  event.status = 'published';
  await event.save();

  return await event.populate([
    { path: 'club', select: 'name category' },
    { path: 'createdBy', select: 'name email' },
  ]);
};

/**
 * Cancel an event.
 */
const cancelEvent = async (eventId, reason, user) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new EventError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  await assertEventOwnership(event, user);

  if (event.status === 'cancelled') {
    throw new EventError('This event is already cancelled.', 'ALREADY_CANCELLED', 400);
  }

  const [activeRegs, activeWaitlists] = await Promise.all([
    Registration.find({ event: event._id, status: 'active' }).select('student'),
    Waitlist.find({ event: event._id, status: 'waiting' }).select('student'),
  ]);
  const recipientIds = [...activeRegs.map((r) => r.student), ...activeWaitlists.map((w) => w.student)];

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    event.status = 'cancelled';
    event.cancellationReason = reason ? reason.trim() : '';
    event.cancelledAt = new Date();
    event.cancelledBy = user._id;

    await event.save({ session });

    // Invalidate all active registrations and active tickets for this cancelled event
    await Registration.updateMany(
      { event: event._id, status: 'active' },
      { status: 'cancelled', cancelledAt: new Date() },
      { session }
    );

    await Ticket.updateMany(
      { event: event._id, status: 'active' },
      { status: 'cancelled', cancelledAt: new Date() },
      { session }
    );

    // Phase 9: Cancel active waitlist entries for this event
    const Waitlist = require('../models/Waitlist');
    await Waitlist.updateMany(
      { event: event._id, status: 'waiting' },
      { status: 'cancelled' },
      { session }
    );

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  // Phase 10 In-App Notification Hook
  try {
    const notificationService = require('./notificationService');
    await notificationService.notifyEventCancelled(event, reason, recipientIds);
  } catch (notifErr) {
    console.error('Failed to send event cancellation notifications:', notifErr.message);
  }

  return await event.populate([
    { path: 'club', select: 'name category' },
    { path: 'createdBy', select: 'name email' },
  ]);
};

/**
 * Public Event Discovery: Search, Filter, Sort, Paginate
 * Only returns published events. Cancelled and draft events are excluded.
 */
const discoverEvents = async (queryParams = {}) => {
  const {
    search,
    category,
    clubId,
    dateFilter = 'upcoming',
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = queryParams;

  const filter = {
    status: 'published',
  };

  // Category filter
  if (category) {
    filter.category = category;
  }

  // Club filter
  if (clubId) {
    filter.club = clubId;
  }

  // Text search on title and description (case-insensitive, regex-escaped)
  if (search && search.trim()) {
    const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  // Date filtering in Asia/Kolkata (IST = UTC+5:30)
  const now = new Date();

  if (dateFilter === 'upcoming') {
    // Upcoming: events whose endDateTime is in the future
    filter.endDateTime = { $gte: now };
  } else if (dateFilter === 'today') {
    // Current IST calendar day bounds converted to UTC
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffsetMs);

    const year = istNow.getUTCFullYear();
    const month = istNow.getUTCMonth();
    const day = istNow.getUTCDate();

    // Start of IST day: year-month-day 00:00:00 IST -> minus 5h30m in UTC
    const istDayStartUtc = new Date(Date.UTC(year, month, day, 0, 0, 0) - istOffsetMs);
    // End of IST day: year-month-day 23:59:59.999 IST -> minus 5h30m in UTC
    const istDayEndUtc = new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - istOffsetMs);

    filter.startDateTime = { $lte: istDayEndUtc };
    filter.endDateTime = { $gte: istDayStartUtc };
  } else if (dateFilter === 'all') {
    // No time bounds applied unless explicit startDate/endDate provided
    if (startDate || endDate) {
      filter.startDateTime = {};
      if (startDate) filter.startDateTime.$gte = new Date(startDate);
      if (endDate) filter.startDateTime.$lte = new Date(endDate);
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  // Execute query with lean projection (exclude internal admin/cancellation data)
  const [events, total] = await Promise.all([
    Event.find(filter)
      .select('-cancellationReason -cancelledAt -cancelledBy -__v')
      .populate('club', 'name category')
      .populate('createdBy', 'name')
      .sort({ startDateTime: 1 })
      .skip(skip)
      .limit(limitNum),
    Event.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);

  return {
    events,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

/**
 * Public Event Details by ID
 * Only returns if published. Excludes internal admin/cancellation fields.
 */
const getPublicEventById = async (eventId) => {
  const event = await Event.findOne({ _id: eventId, status: 'published' })
    .select('-cancellationReason -cancelledAt -cancelledBy -__v')
    .populate('club', 'name category description')
    .populate('createdBy', 'name');

  if (!event) {
    throw new EventError('Event not found or not published.', 'EVENT_NOT_FOUND', 404);
  }

  return event;
};

module.exports = {
  EventError,
  createEvent,
  getEventById,
  getAuthorizedEvents,
  discoverEvents,
  getPublicEventById,
  updateEvent,
  publishEvent,
  cancelEvent,
};
