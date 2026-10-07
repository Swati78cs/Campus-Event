const express = require('express');
const router = express.Router();
const volunteerController = require('../controllers/volunteerController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  searchEligibleQuerySchema,
  myVolunteerEventsQuerySchema,
} = require('../validators/volunteerValidators');

// All volunteer endpoints require authentication
router.use(authenticate);

// Student/Organizer/Admin: Get active events assigned to current authenticated volunteer
router.get(
  '/my-events',
  validate(myVolunteerEventsQuerySchema),
  volunteerController.getMyEvents
);

// Get current volunteer status/count for badges and navigation
router.get(
  '/status',
  volunteerController.getMyVolunteerStatus
);

// Organizer/Admin: Search active users eligible to be assigned as volunteers
router.get(
  '/eligible-users',
  authorize('organizer', 'admin'),
  validate(searchEligibleQuerySchema),
  volunteerController.searchEligible
);

module.exports = router;
