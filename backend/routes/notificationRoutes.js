const express = require('express');
const {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
} = require('../validators/notificationValidators');

const router = express.Router();

// All notification routes require authenticated user
router.use(authenticate);

// Get count of unread notifications
router.get('/unread-count', getUnreadCount);

// Mark all notifications as read
router.patch('/read-all', markAllRead);

// Mark single notification as read
router.patch('/:notificationId/read', validate(notificationIdParamSchema), markRead);

// Get paginated notifications
router.get('/', validate(listNotificationsQuerySchema), listNotifications);

module.exports = router;
