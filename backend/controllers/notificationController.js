const notificationService = require('../services/notificationService');

/**
 * GET /api/notifications
 * Retrieve paginated notifications for the authenticated user.
 */
const listNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getUserNotifications(req.user._id, req.query);
    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/unread-count
 * Get the count of unread notifications for the authenticated user.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount(req.user._id);
    res.status(200).json({
      success: true,
      message: 'Unread count retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark a single notification as read.
 */
const markRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const notification = await notificationService.markAsRead(notificationId, req.user._id);
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all unread notifications of the authenticated user as read.
 */
const markAllRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user._id);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events/:eventId/announcements
 * Create an announcement for an event (Organizers & Admins only).
 */
const postAnnouncement = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { title, message } = req.body;
    const result = await notificationService.createAnnouncement(
      eventId,
      title,
      message,
      req.user
    );
    res.status(201).json({
      success: true,
      message: 'Announcement published successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  postAnnouncement,
};
