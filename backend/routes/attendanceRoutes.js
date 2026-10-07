const express = require('express');
const {
  checkInByQr,
  checkInManual,
  overrideAttendance,
  getEventAttendance,
  getAttendanceStats,
  searchAttendees,
} = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  eventIdParamSchema,
  checkInByQrSchema,
  checkInManualSchema,
  adminOverrideSchema,
  getAttendanceListSchema,
  searchAttendeesQuerySchema,
} = require('../validators/attendanceValidators');

const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router({ mergeParams: true });

const checkInLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 150,
  message: 'Check-in request rate limit reached. Please wait a moment before trying again.',
  code: 'CHECKIN_RATE_LIMIT_EXCEEDED',
});

// All attendance endpoints require authentication
router.use(authenticate);

// 1. QR Check-in
router.post('/qr', checkInLimiter, validate(checkInByQrSchema), checkInByQr);

// 2. Manual Check-in by student ID
router.post('/manual', checkInLimiter, validate(checkInManualSchema), checkInManual);

// 3. Admin Override Check-in
router.post(
  '/:studentId/override',
  authorize('admin'),
  validate(adminOverrideSchema),
  overrideAttendance
);

// 4. Attendance Statistics
router.get('/stats', validate(eventIdParamSchema), getAttendanceStats);

// 5. Search Registered Attendees
router.get('/search', validate(searchAttendeesQuerySchema), searchAttendees);

// 6. Get Attendance List with filters and pagination
router.get('/', validate(getAttendanceListSchema), getEventAttendance);

module.exports = router;
