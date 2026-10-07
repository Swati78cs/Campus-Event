const mongoose = require('mongoose');
const { Notification, notificationTypes } = require('../models/Notification');
const User = require('../models/User');
const Event = require('../models/Event');
const Club = require('../models/Club');
const Registration = require('../models/Registration');
const Waitlist = require('../models/Waitlist');

class NotificationError extends Error {
  constructor(message, code = 'NOTIFICATION_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'NotificationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Create a single in-app notification.
 * Silently skips if recipient account is inactive or not found.
 */
const createNotification = async ({
  recipient,
  type,
  title,
  message,
  eventId = null,
  dedupKey = null,
  metadata = {},
  session = null,
}) => {
  if (!notificationTypes.includes(type)) {
    throw new NotificationError(`Invalid notification type: ${type}`, 'INVALID_TYPE', 400);
  }

  // Verify recipient exists and is active
  const user = await User.findById(recipient).session(session);
  if (!user || !user.isActive) {
    return null;
  }

  // Deduplication check
  if (dedupKey) {
    const existing = await Notification.findOne({
      recipient,
      dedupKey,
    }).session(session);
    if (existing) {
      return existing;
    }
  }

  try {
    const [notification] = await Notification.create(
      [
        {
          recipient,
          type,
          title,
          message,
          event: eventId,
          dedupKey,
          metadata,
          isRead: false,
        },
      ],
      session ? { session } : {}
    );
    return notification;
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key caught concurrently
      return await Notification.findOne({ recipient, dedupKey }).session(session);
    }
    throw err;
  }
};

/**
 * Create in-app notifications for multiple recipients (e.g. announcements, schedule updates).
 * Deduplicates recipient list and only targets active users.
 */
const createNotificationsForUsers = async (
  recipientIds,
  { type, title, message, eventId = null, dedupKeyPrefix = null, metadata = {} },
  session = null
) => {
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
    return [];
  }

  // Remove duplicates and stringify IDs
  const uniqueRecipientIds = [...new Set(recipientIds.map((id) => id.toString()))];

  // Filter only active users
  const activeUsers = await User.find({
    _id: { $in: uniqueRecipientIds },
    isActive: true,
  })
    .select('_id')
    .session(session);

  const activeUserIds = activeUsers.map((u) => u._id);
  if (activeUserIds.length === 0) {
    return [];
  }

  const notificationsToCreate = activeUserIds.map((userId) => ({
    recipient: userId,
    type,
    title,
    message,
    event: eventId,
    dedupKey: dedupKeyPrefix ? `${dedupKeyPrefix}_${userId}` : null,
    metadata,
    isRead: false,
  }));

  try {
    const created = await Notification.insertMany(notificationsToCreate, {
      ordered: false,
      session,
    });
    return created;
  } catch (err) {
    // If some had duplicate keys, return those inserted
    if (err.insertedDocs && err.insertedDocs.length > 0) {
      return err.insertedDocs;
    }
    // Fallback: individually insert
    const results = [];
    for (const item of notificationsToCreate) {
      try {
        const notif = await createNotification({ ...item, session });
        if (notif) results.push(notif);
      } catch (innerErr) {
        console.warn('[NotificationService] Individual insert warning:', innerErr.message);
      }
    }
    return results;
  }
};

/**
 * Get paginated list of notifications for the authenticated user.
 */
const getUserNotifications = async (userId, queryParams = {}) => {
  const { page = 1, limit = 20, isRead } = queryParams;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = { recipient: userId };
  if (isRead !== undefined) {
    filter.isRead = isRead;
  }

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate('event', 'title category venue startDateTime endDateTime status bannerUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  const totalPages = Math.ceil(total / limitNum) || (total === 0 ? 0 : 1);

  return {
    items,
    notifications: items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
    unreadCount,
  };
};

/**
 * Get unread notification count for authenticated user.
 */
const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });
  return { count };
};

/**
 * Mark a specific notification as read.
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new NotificationError('Notification not found.', 'NOTIFICATION_NOT_FOUND', 404);
  }

  if (notification.recipient.toString() !== userId.toString()) {
    throw new NotificationError(
      'You are not authorized to access this notification.',
      'FORBIDDEN',
      403
    );
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

/**
 * Mark all unread notifications of the authenticated user as read.
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return {
    message: 'All notifications marked as read',
    modifiedCount: result.modifiedCount || 0,
  };
};

/**
 * Organizer / Admin creates an announcement for an event.
 */
const createAnnouncement = async (eventId, title, message, currentUser) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new NotificationError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  // Authorization check: Admins global, Organizers must be assigned to event club
  if (currentUser.role === 'admin') {
    // Authorized
  } else if (currentUser.role === 'organizer') {
    const club = await Club.findById(event.club);
    const isAssigned =
      club &&
      club.organizers &&
      club.organizers.some((orgId) => orgId.toString() === currentUser._id.toString());
    if (!isAssigned) {
      throw new NotificationError(
        'You are not authorized to create announcements for this club event.',
        'FORBIDDEN',
        403
      );
    }
  } else {
    throw new NotificationError(
      'Access denied: Only event organizers and administrators can create announcements.',
      'FORBIDDEN',
      403
    );
  }

  // Audience snapshot: Active registered students + Active waitlisted students
  const [activeRegistrations, activeWaitlist] = await Promise.all([
    Registration.find({ event: eventId, status: 'active' }).select('student'),
    Waitlist.find({ event: eventId, status: 'waiting' }).select('student'),
  ]);

  const recipientIds = [
    ...activeRegistrations.map((r) => r.student),
    ...activeWaitlist.map((w) => w.student),
  ];

  const dedupKeyPrefix = `announcement_${eventId}_${Date.now()}`;

  const createdNotifications = await createNotificationsForUsers(
    recipientIds,
    {
      type: 'ORGANIZER_ANNOUNCEMENT',
      title,
      message,
      eventId: event._id,
      dedupKeyPrefix,
      metadata: {
        eventTitle: event.title,
        announcementBy: currentUser.name,
      },
    }
  );

  return {
    announcement: {
      eventId: event._id,
      eventTitle: event.title,
      title,
      message,
      recipientCount: createdNotifications.length,
    },
  };
};

// ==========================================
// Safe Trigger Hooks for Existing Services
// ==========================================

const notifyRegistrationConfirmed = async (studentId, event, session = null) => {
  try {
    return await createNotification({
      recipient: studentId,
      type: 'REGISTRATION_CONFIRMED',
      title: `Registration Confirmed: ${event.title}`,
      message: `Your registration for "${event.title}" has been confirmed. You can view your digital pass in My Tickets.`,
      eventId: event._id,
      dedupKey: `reg_confirmed_${event._id}_${studentId}`,
      metadata: { eventTitle: event.title },
      session,
    });
  } catch (err) {
    console.error('[NotificationService] notifyRegistrationConfirmed error:', err.message);
    return null;
  }
};

const notifyRegistrationCancelled = async (studentId, event, session = null) => {
  try {
    return await createNotification({
      recipient: studentId,
      type: 'REGISTRATION_CANCELLED',
      title: `Registration Cancelled: ${event.title}`,
      message: `Your registration for "${event.title}" has been cancelled.`,
      eventId: event._id,
      dedupKey: `reg_cancelled_${event._id}_${studentId}_${Date.now()}`,
      metadata: { eventTitle: event.title },
      session,
    });
  } catch (err) {
    console.error('[NotificationService] notifyRegistrationCancelled error:', err.message);
    return null;
  }
};

const notifyWaitlistPromoted = async (studentId, event, session = null) => {
  try {
    return await createNotification({
      recipient: studentId,
      type: 'WAITLIST_PROMOTED',
      title: `Promoted from Waitlist: ${event.title}`,
      message: `Great news! A seat opened up for "${event.title}" and your registration has been automatically confirmed. Your QR ticket is ready in My Tickets.`,
      eventId: event._id,
      dedupKey: `waitlist_promoted_${event._id}_${studentId}`,
      metadata: { eventTitle: event.title },
      session,
    });
  } catch (err) {
    console.error('[NotificationService] notifyWaitlistPromoted error:', err.message);
    return null;
  }
};

const notifyEventCancelled = async (event, cancellationReason, recipientIds = null) => {
  try {
    let targetIds = recipientIds;
    if (!targetIds) {
      const [regs, waitlists] = await Promise.all([
        Registration.find({ event: event._id, status: 'active' }).select('student'),
        Waitlist.find({ event: event._id, status: 'waiting' }).select('student'),
      ]);
      targetIds = [...regs.map((r) => r.student), ...waitlists.map((w) => w.student)];
    }

    return await createNotificationsForUsers(
      targetIds,
      {
        type: 'EVENT_CANCELLED',
        title: `Event Cancelled: ${event.title}`,
        message: `The event "${event.title}" has been cancelled.${
          cancellationReason ? ` Reason: ${cancellationReason}` : ''
        }`,
        eventId: event._id,
        dedupKeyPrefix: `event_cancelled_${event._id}`,
        metadata: {
          eventTitle: event.title,
          cancellationReason: cancellationReason || '',
        },
      }
    );
  } catch (err) {
    console.error('[NotificationService] notifyEventCancelled error:', err.message);
    return [];
  }
};

const notifyEventDateChanged = async (event, oldStart, oldEnd, newStart, newEnd) => {
  try {
    const [regs, waitlists] = await Promise.all([
      Registration.find({ event: event._id, status: 'active' }).select('student'),
      Waitlist.find({ event: event._id, status: 'waiting' }).select('student'),
    ]);

    const recipientIds = [...regs.map((r) => r.student), ...waitlists.map((w) => w.student)];

    const oldDateStr = new Date(oldStart).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const newDateStr = new Date(newStart).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return await createNotificationsForUsers(recipientIds, {
      type: 'EVENT_DATE_CHANGED',
      title: `Schedule Update: ${event.title}`,
      message: `The schedule for "${event.title}" has been changed. Previous start: ${oldDateStr}. New start: ${newDateStr}.`,
      eventId: event._id,
      dedupKeyPrefix: `event_date_${event._id}_${new Date(newStart).getTime()}`,
      metadata: {
        eventTitle: event.title,
        oldStart,
        newStart,
        oldEnd,
        newEnd,
      },
    });
  } catch (err) {
    console.error('[NotificationService] notifyEventDateChanged error:', err.message);
    return [];
  }
};

const notifyEventVenueChanged = async (event, oldVenue, newVenue) => {
  try {
    const [regs, waitlists] = await Promise.all([
      Registration.find({ event: event._id, status: 'active' }).select('student'),
      Waitlist.find({ event: event._id, status: 'waiting' }).select('student'),
    ]);

    const recipientIds = [...regs.map((r) => r.student), ...waitlists.map((w) => w.student)];

    return await createNotificationsForUsers(recipientIds, {
      type: 'EVENT_VENUE_CHANGED',
      title: `Venue Update: ${event.title}`,
      message: `The venue for "${event.title}" has changed from "${oldVenue}" to "${newVenue}".`,
      eventId: event._id,
      dedupKeyPrefix: `event_venue_${event._id}_${Date.now()}`,
      metadata: {
        eventTitle: event.title,
        oldVenue,
        newVenue,
      },
    });
  } catch (err) {
    console.error('[NotificationService] notifyEventVenueChanged error:', err.message);
    return [];
  }
};

module.exports = {
  NotificationError,
  createNotification,
  createNotificationsForUsers,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createAnnouncement,
  notifyRegistrationConfirmed,
  notifyRegistrationCancelled,
  notifyWaitlistPromoted,
  notifyEventCancelled,
  notifyEventDateChanged,
  notifyEventVenueChanged,
};
