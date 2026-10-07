const mongoose = require('mongoose');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Attendance = require('../models/Attendance');
const Feedback = require('../models/Feedback');
const Club = require('../models/Club');
const User = require('../models/User');

class AnalyticsError extends Error {
  constructor(message, code = 'ANALYTICS_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'AnalyticsError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Verify if organizer or admin has access to view analytics for an event.
 */
const assertOrganizerEventAnalyticsAccess = async (event, user) => {
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
      throw new AnalyticsError(
        'You are not authorized to view analytics for events outside your managed clubs.',
        'UNAUTHORIZED_EVENT_ANALYTICS',
        403
      );
    }
    return true;
  }

  throw new AnalyticsError(
    'Access denied: Only event organizers and administrators can view event analytics.',
    'UNAUTHORIZED_EVENT_ANALYTICS',
    403
  );
};

/**
 * Get comprehensive analytics for a specific event.
 */
const getEventAnalytics = async (eventId, user) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AnalyticsError('Event not found.', 'EVENT_NOT_FOUND', 404);
  }

  // Authorization check
  await assertOrganizerEventAnalyticsAccess(event, user);

  const eventObjectId = new mongoose.Types.ObjectId(eventId);

  // 1. Registration Statistics (Authoritative MongoDB aggregation)
  const regAggregation = await Registration.aggregate([
    { $match: { event: eventObjectId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  let activeRegistrations = 0;
  let cancelledRegistrations = 0;
  let totalRegistrations = 0;

  regAggregation.forEach((item) => {
    totalRegistrations += item.count;
    if (item._id === 'active') {
      activeRegistrations = item.count;
    } else if (item._id === 'cancelled') {
      cancelledRegistrations = item.count;
    }
  });

  const capacity = typeof event.capacity === 'number' && event.capacity > 0 ? event.capacity : 0;
  const availableSeats = Math.max(0, capacity - activeRegistrations);

  // Capacity utilization formula: (active registrations / capacity) * 100
  const utilizationPercentage =
    capacity > 0
      ? Number(Math.min(100, (activeRegistrations / capacity) * 100).toFixed(1))
      : 0;

  // 2. Attendance Statistics (Authoritative Attendance records)
  const attAggregation = await Attendance.aggregate([
    {
      $match: {
        event: eventObjectId,
        status: { $in: ['checked_in', 'overridden'] },
      },
    },
    {
      $group: {
        _id: { method: '$method', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  let checkedInAttendees = 0;
  let qrCount = 0;
  let manualCount = 0;
  let overrideCount = 0;

  attAggregation.forEach((item) => {
    checkedInAttendees += item.count;
    if (item._id.status === 'overridden') {
      overrideCount += item.count;
    } else if (item._id.method === 'qr') {
      qrCount += item.count;
    } else if (item._id.method === 'manual') {
      manualCount += item.count;
    }
  });

  // Check-in rate formula: (valid attendees / active registrations) * 100
  const checkInRate =
    activeRegistrations > 0
      ? Number(Math.min(100, (checkedInAttendees / activeRegistrations) * 100).toFixed(1))
      : 0;

  // 3. Sign-ups Over Time (Registration Trend grouped by UTC date)
  const trendAggregation = await Registration.aggregate([
    {
      $match: {
        event: eventObjectId,
        status: 'active',
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$registeredAt',
            timezone: 'UTC',
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        count: 1,
      },
    },
  ]);

  // 4. Feedback Rating (Reused from existing feedback data if available)
  const feedbackAggregation = await Feedback.aggregate([
    { $match: { event: eventObjectId } },
    {
      $group: {
        _id: null,
        totalFeedback: { $sum: 1 },
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  const feedbackStats = {
    totalFeedback: feedbackAggregation.length > 0 ? feedbackAggregation[0].totalFeedback : 0,
    averageRating:
      feedbackAggregation.length > 0 && feedbackAggregation[0].averageRating !== null
        ? Number(feedbackAggregation[0].averageRating.toFixed(1))
        : 0,
  };

  return {
    event: {
      id: event._id,
      title: event.title,
      status: event.status,
      category: event.category,
      capacity,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
    },
    registrations: {
      total: totalRegistrations,
      active: activeRegistrations,
      cancelled: cancelledRegistrations,
      availableSeats,
      utilizationPercentage,
    },
    attendance: {
      checkedIn: checkedInAttendees,
      checkInRate,
      breakdown: {
        qr: qrCount,
        manual: manualCount,
        override: overrideCount,
      },
    },
    registrationTrend: trendAggregation,
    feedback: feedbackStats,
  };
};

/**
 * Get organizer-level overview analytics for authorized events.
 */
const getOrganizerOverview = async (user, { clubId, page = 1, limit = 20 }) => {
  if (user.role !== 'admin' && user.role !== 'organizer') {
    throw new AnalyticsError(
      'Access denied: Only event organizers and administrators can view organizer analytics.',
      'UNAUTHORIZED_ORGANIZER_ANALYTICS',
      403
    );
  }

  // Determine authorized clubs
  let authorizedClubIds = [];
  if (user.role === 'admin') {
    if (clubId) {
      authorizedClubIds = [new mongoose.Types.ObjectId(clubId)];
    } else {
      const allClubs = await Club.find().select('_id');
      authorizedClubIds = allClubs.map((c) => c._id);
    }
  } else {
    // Organizer role
    const managedClubs = await Club.find({ organizers: user._id }).select('_id');
    const managedIds = managedClubs.map((c) => c._id.toString());

    if (clubId) {
      if (!managedIds.includes(clubId.toString())) {
        throw new AnalyticsError(
          'You are not authorized to view analytics for this club.',
          'UNAUTHORIZED_CLUB_ACCESS',
          403
        );
      }
      authorizedClubIds = [new mongoose.Types.ObjectId(clubId)];
    } else {
      authorizedClubIds = managedClubs.map((c) => c._id);
    }
  }

  if (authorizedClubIds.length === 0) {
    return {
      totalEvents: 0,
      totalRegistrations: 0,
      totalAttendees: 0,
      averageCheckInRate: 0,
      capacityUtilization: 0,
      events: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 1,
      },
    };
  }

  // Query authorized events
  const eventFilter = { club: { $in: authorizedClubIds } };
  const totalEvents = await Event.countDocuments(eventFilter);

  // Paginated list of events
  const skip = (page - 1) * limit;
  const events = await Event.find(eventFilter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('club', 'name')
    .lean();

  const eventIds = events.map((e) => e._id);

  // Aggregate active registrations for paginated events
  const activeRegCounts = await Registration.aggregate([
    { $match: { event: { $in: eventIds }, status: 'active' } },
    { $group: { _id: '$event', count: { $sum: 1 } } },
  ]);
  const regMap = {};
  activeRegCounts.forEach((r) => {
    regMap[r._id.toString()] = r.count;
  });

  // Aggregate attendance for paginated events
  const attendanceCounts = await Attendance.aggregate([
    {
      $match: {
        event: { $in: eventIds },
        status: { $in: ['checked_in', 'overridden'] },
      },
    },
    { $group: { _id: '$event', count: { $sum: 1 } } },
  ]);
  const attMap = {};
  attendanceCounts.forEach((a) => {
    attMap[a._id.toString()] = a.count;
  });

  // Map individual event summary
  const eventSummaries = events.map((ev) => {
    const evIdStr = ev._id.toString();
    const active = regMap[evIdStr] || 0;
    const attended = attMap[evIdStr] || 0;
    const capacity = ev.capacity || 0;
    const checkInRate = active > 0 ? Number(((attended / active) * 100).toFixed(1)) : 0;
    const capacityUtilization =
      capacity > 0 ? Number(((active / capacity) * 100).toFixed(1)) : 0;

    return {
      id: ev._id,
      title: ev.title,
      clubName: ev.club?.name || 'Club',
      status: ev.status,
      capacity,
      activeRegistrations: active,
      attended,
      checkInRate,
      capacityUtilization,
      startDateTime: ev.startDateTime,
      endDateTime: ev.endDateTime,
    };
  });

  // Aggregate ALL authorized events for platform summary stats
  const allAuthorizedEvents = await Event.find(eventFilter).select('_id capacity');
  const allEventIds = allAuthorizedEvents.map((e) => e._id);
  const totalCapacity = allAuthorizedEvents.reduce((sum, e) => sum + (e.capacity || 0), 0);

  const [totalRegResult, totalAttResult] = await Promise.all([
    Registration.countDocuments({ event: { $in: allEventIds }, status: 'active' }),
    Attendance.countDocuments({
      event: { $in: allEventIds },
      status: { $in: ['checked_in', 'overridden'] },
    }),
  ]);

  const totalRegistrations = totalRegResult;
  const totalAttendees = totalAttResult;
  const averageCheckInRate =
    totalRegistrations > 0
      ? Number(((totalAttendees / totalRegistrations) * 100).toFixed(1))
      : 0;
  const overallCapacityUtilization =
    totalCapacity > 0
      ? Number(((totalRegistrations / totalCapacity) * 100).toFixed(1))
      : 0;

  return {
    totalEvents,
    totalRegistrations,
    totalAttendees,
    averageCheckInRate,
    capacityUtilization: overallCapacityUtilization,
    events: eventSummaries,
    pagination: {
      page,
      limit,
      total: totalEvents,
      totalPages: Math.ceil(totalEvents / limit) || 1,
    },
  };
};

/**
 * Get admin global platform overview analytics.
 */
const getAdminOverview = async (user) => {
  if (user.role !== 'admin') {
    throw new AnalyticsError(
      'Access denied: Only administrators can view platform overview analytics.',
      'FORBIDDEN_ADMIN_ACCESS',
      403
    );
  }

  const now = new Date();

  const [
    totalUsers,
    studentUsers,
    organizerUsers,
    adminUsers,
    activeUsers,
    totalClubs,
    totalEvents,
    draftEvents,
    publishedEvents,
    cancelledEvents,
    completedEvents,
    upcomingEvents,
    totalActiveRegistrations,
    totalCancelledRegistrations,
    totalAttendees,
    capacitySumResult,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'organizer' }),
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ isActive: true }),
    Club.countDocuments(),
    Event.countDocuments(),
    Event.countDocuments({ status: 'draft' }),
    Event.countDocuments({ status: 'published' }),
    Event.countDocuments({ status: 'cancelled' }),
    Event.countDocuments({ endDateTime: { $lt: now }, status: { $ne: 'cancelled' } }),
    Event.countDocuments({ startDateTime: { $gt: now }, status: 'published' }),
    Registration.countDocuments({ status: 'active' }),
    Registration.countDocuments({ status: 'cancelled' }),
    Attendance.countDocuments({ status: { $in: ['checked_in', 'overridden'] } }),
    Event.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: null, totalCapacity: { $sum: '$capacity' } } },
    ]),
  ]);

  const totalCapacity =
    capacitySumResult.length > 0 && capacitySumResult[0].totalCapacity
      ? capacitySumResult[0].totalCapacity
      : 0;

  const overallCheckInRate =
    totalActiveRegistrations > 0
      ? Number(((totalAttendees / totalActiveRegistrations) * 100).toFixed(1))
      : 0;

  const overallCapacityUtilization =
    totalCapacity > 0
      ? Number(((totalActiveRegistrations / totalCapacity) * 100).toFixed(1))
      : 0;

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      students: studentUsers,
      organizers: organizerUsers,
      admins: adminUsers,
    },
    clubs: {
      total: totalClubs,
    },
    events: {
      total: totalEvents,
      draft: draftEvents,
      published: publishedEvents,
      cancelled: cancelledEvents,
      completed: completedEvents,
      upcoming: upcomingEvents,
      totalCapacity,
    },
    registrations: {
      active: totalActiveRegistrations,
      cancelled: totalCancelledRegistrations,
      total: totalActiveRegistrations + totalCancelledRegistrations,
      capacityUtilization: overallCapacityUtilization,
    },
    attendance: {
      totalAttendees,
      checkInRate: overallCheckInRate,
    },
  };
};

module.exports = {
  AnalyticsError,
  assertOrganizerEventAnalyticsAccess,
  getEventAnalytics,
  getOrganizerOverview,
  getAdminOverview,
};
