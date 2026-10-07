const express = require('express');
const {
  register,
  cancel,
  getMyRegistration,
  getMyEventsList,
  getEventAttendees,
} = require('../controllers/registrationController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  eventIdParamSchema,
  listRegistrationsQuerySchema,
  myEventsQuerySchema,
} = require('../validators/registrationValidators');

const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const registrationLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Registration request limit reached. Please wait a moment before trying again.',
  code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
});

// All registration operations require authentication
router.use(authenticate);

// Student registration endpoints
router.get('/my-events', authorize('student'), validate(myEventsQuerySchema), getMyEventsList);

// Specific event registration queries and actions
router.get('/:eventId/registration', authorize('student'), validate(eventIdParamSchema), getMyRegistration);
router.post('/:eventId/register', registrationLimiter, authorize('student'), validate(eventIdParamSchema), register);
router.delete('/:eventId/register', authorize('student'), validate(eventIdParamSchema), cancel);

// Organizer & Admin attendee view (protected and club-scoped)
router.get(
  '/manage/:eventId/registrations',
  authorize('organizer', 'admin'),
  validate(listRegistrationsQuerySchema),
  getEventAttendees
);

module.exports = router;
