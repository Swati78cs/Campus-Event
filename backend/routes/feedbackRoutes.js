const express = require('express');
const {
  submitFeedback,
  getMyFeedback,
  getEventFeedback,
} = require('../controllers/feedbackController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  submitFeedbackSchema,
  getEventFeedbackQuerySchema,
  eventIdParamSchema,
} = require('../validators/feedbackValidators');

const router = express.Router({ mergeParams: true });

// GET /api/events/:eventId/feedback/my - Student get own feedback & eligibility
router.get('/my', authenticate, validate(eventIdParamSchema), getMyFeedback);

// GET /api/events/:eventId/feedback - Organizer/Admin get event feedback list & stats
// POST /api/events/:eventId/feedback - Eligible attendee submit feedback
router
  .route('/')
  .get(
    authenticate,
    authorize('organizer', 'admin'),
    validate(getEventFeedbackQuerySchema),
    getEventFeedback
  )
  .post(
    authenticate,
    validate(submitFeedbackSchema),
    submitFeedback
  );

module.exports = router;
