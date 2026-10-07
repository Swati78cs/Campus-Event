const express = require('express');
const {
  join,
  getMyStatus,
  leave,
  getMyEvents,
  getEventWaitlist,
  removeStudent,
} = require('../controllers/waitlistController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  eventIdParamSchema,
  eventIdAndStudentIdParamSchema,
  waitlistQuerySchema,
  myWaitlistQuerySchema,
} = require('../validators/waitlistValidators');

const router = express.Router({ mergeParams: true });

// All waitlist routes require authentication
router.use(authenticate);

// Student endpoint: get all events student is waitlisted for
router.get('/my-events', authorize('student'), validate(myWaitlistQuerySchema), getMyEvents);

// Student endpoint: get current student's waitlist status for this event
router.get('/me', authorize('student'), validate(eventIdParamSchema), getMyStatus);

// Student endpoint: join waitlist for this event
router.post('/', authorize('student'), validate(eventIdParamSchema), join);

// Student endpoint: leave waitlist for this event
router.delete('/', authorize('student'), validate(eventIdParamSchema), leave);

// Organizer/Admin endpoint: view event waitlist
router.get('/', authorize('organizer', 'admin'), validate(waitlistQuerySchema), getEventWaitlist);

// Organizer/Admin endpoint: remove student from event waitlist
router.delete(
  '/:studentId',
  authorize('organizer', 'admin'),
  validate(eventIdAndStudentIdParamSchema),
  removeStudent
);

module.exports = router;
