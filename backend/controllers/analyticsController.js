const analyticsService = require('../services/analyticsService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Retrieve comprehensive analytics for an authorized event.
 * GET /api/events/:eventId/analytics (or /api/analytics/events/:eventId)
 */
const getEventAnalytics = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const data = await analyticsService.getEventAnalytics(eventId, req.user);
    return sendSuccess(res, 200, 'Event analytics retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve organizer-level overview analytics for authorized events.
 * GET /api/analytics/organizer
 */
const getOrganizerOverview = async (req, res, next) => {
  try {
    const data = await analyticsService.getOrganizerOverview(req.user, req.query);
    return sendSuccess(res, 200, 'Organizer analytics retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve platform-level overview analytics for administrators.
 * GET /api/analytics/admin
 */
const getAdminOverview = async (req, res, next) => {
  try {
    const data = await analyticsService.getAdminOverview(req.user);
    return sendSuccess(res, 200, 'Platform analytics retrieved successfully', data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEventAnalytics,
  getOrganizerOverview,
  getAdminOverview,
};
