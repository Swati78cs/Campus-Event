const express = require('express');
const {
  getEventAnalytics,
  getOrganizerOverview,
  getAdminOverview,
} = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  eventIdParamSchema,
  organizerOverviewQuerySchema,
} = require('../validators/analyticsValidators');

const router = express.Router();

// GET /api/analytics/organizer - Organizer overview of managed clubs/events
router.get(
  '/organizer',
  authenticate,
  authorize('organizer', 'admin'),
  validate(organizerOverviewQuerySchema),
  getOrganizerOverview
);

// GET /api/analytics/admin - Platform-wide overview for admins
router.get(
  '/admin',
  authenticate,
  authorize('admin'),
  getAdminOverview
);

// GET /api/analytics/events/:eventId - Individual event analytics
router.get(
  '/events/:eventId',
  authenticate,
  authorize('organizer', 'admin'),
  validate(eventIdParamSchema),
  getEventAnalytics
);

module.exports = router;
