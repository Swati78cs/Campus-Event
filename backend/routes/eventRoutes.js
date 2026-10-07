const express = require('express');
const {
  discover,
  getPublicById,
  create,
  list,
  getById,
  update,
  publish,
  cancel,
} = require('../controllers/eventController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createEventSchema,
  updateEventSchema,
  cancelEventSchema,
  eventIdParamSchema,
  discoveryQuerySchema,
} = require('../validators/eventValidators');

const router = express.Router();

// Middleware to optionally attach user if JWT cookie or header is present without rejecting unauthenticated users
const optionalAuth = async (req, res, next) => {
  try {
    const { parseCookies, COOKIE_NAME } = require('../utils/cookies');
    const { verifyToken } = require('../utils/jwt');
    const User = require('../models/User');

    const cookies = parseCookies(req);
    let token = cookies[COOKIE_NAME];
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id);
        if (user && user.isActive) {
          req.user = user;
        }
      }
    }
  } catch (err) {
    // Silently ignore auth errors for public endpoint
  }
  next();
};

// ==========================================
// Event Query Endpoints
// ==========================================
// If organizer/admin passes manage=true or status=all, or requests management list, route to management list
router.get('/', optionalAuth, (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'organizer') && (req.query.status || req.query.manage === 'true')) {
    return list(req, res, next);
  }
  return validate(discoveryQuerySchema)(req, res, () => discover(req, res, next));
});

router.get('/manage/list', authenticate, authorize('organizer', 'admin'), list);
router.get('/manage/:id', authenticate, authorize('organizer', 'admin'), validate(eventIdParamSchema), getById);

// Public event details by ID, or management details if user is authorized organizer/admin
router.get('/:id', optionalAuth, validate(eventIdParamSchema), async (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'organizer')) {
    try {
      return await getById(req, res, next);
    } catch (err) {
      if (err.statusCode === 403 || err.statusCode === 404) {
        // Fallback to public endpoint
        return getPublicById(req, res, next);
      }
      return next(err);
    }
  }
  return getPublicById(req, res, next);
});
router.post('/', authenticate, authorize('organizer', 'admin'), validate(createEventSchema), create);
router.put('/:id', authenticate, authorize('organizer', 'admin'), validate(updateEventSchema), update);
router.patch('/:id/publish', authenticate, authorize('organizer', 'admin'), validate(eventIdParamSchema), publish);
router.patch('/:id/cancel', authenticate, authorize('organizer', 'admin'), validate(cancelEventSchema), cancel);

// ==========================================
// Event Registration Direct Endpoints
// ==========================================
const {
  register,
  cancel: cancelReg,
  getMyRegistration,
  getEventAttendees,
} = require('../controllers/registrationController');
const {
  listRegistrationsQuerySchema,
} = require('../validators/registrationValidators');

router.post('/:eventId/register', authenticate, authorize('student'), register);
router.delete('/:eventId/register', authenticate, authorize('student'), cancelReg);
router.get('/:eventId/registration', authenticate, authorize('student'), getMyRegistration);
router.get(
  '/manage/:eventId/registrations',
  authenticate,
  authorize('organizer', 'admin'),
  validate(listRegistrationsQuerySchema),
  getEventAttendees
);

// ==========================================
// Event Volunteer Management Endpoints
// ==========================================
const {
  assign: assignVolunteerController,
  getVolunteers: getEventVolunteersController,
  remove: removeVolunteerController,
} = require('../controllers/volunteerController');
const {
  assignVolunteerSchema,
  removeVolunteerSchema,
  eventIdParamSchema: volunteerEventIdParamSchema,
} = require('../validators/volunteerValidators');

router.post(
  '/:eventId/volunteers',
  authenticate,
  authorize('organizer', 'admin'),
  validate(assignVolunteerSchema),
  assignVolunteerController
);

router.get(
  '/:eventId/volunteers',
  authenticate,
  authorize('organizer', 'admin'),
  validate(volunteerEventIdParamSchema),
  getEventVolunteersController
);

router.delete(
  '/:eventId/volunteers/:userId',
  authenticate,
  authorize('organizer', 'admin'),
  validate(removeVolunteerSchema),
  removeVolunteerController
);

// ==========================================
// Event Attendance & Check-In Endpoints (Phase 8)
// ==========================================
const attendanceRoutes = require('./attendanceRoutes');
router.use('/:eventId/attendance', attendanceRoutes);

// ==========================================
// Event Waitlist Endpoints (Phase 9)
// ==========================================
const waitlistRoutes = require('./waitlistRoutes');
router.use('/:eventId/waitlist', waitlistRoutes);

// ==========================================
// Event Announcement Endpoints (Phase 10)
// ==========================================
const { postAnnouncement } = require('../controllers/notificationController');
const { createAnnouncementSchema } = require('../validators/notificationValidators');

router.post(
  '/:eventId/announcements',
  authenticate,
  authorize('organizer', 'admin'),
  validate(createAnnouncementSchema),
  postAnnouncement
);

// ==========================================
// Event Certificate Endpoints (Phase 11)
// ==========================================
const {
  getEventCertificates,
  issueSingleCertificate,
  bulkIssueEventCertificates,
} = require('../controllers/certificateController');
const {
  eventIdParamSchema: certEventIdParamSchema,
  issueCertificateSchema,
} = require('../validators/certificateValidators');

router.get(
  '/:eventId/certificates',
  authenticate,
  authorize('organizer', 'admin'),
  validate(certEventIdParamSchema),
  getEventCertificates
);

router.post(
  '/:eventId/certificates/issue',
  authenticate,
  authorize('organizer', 'admin'),
  validate(issueCertificateSchema),
  issueSingleCertificate
);

router.post(
  '/:eventId/certificates/issue-all',
  authenticate,
  authorize('organizer', 'admin'),
  validate(certEventIdParamSchema),
  bulkIssueEventCertificates
);

// ==========================================
// Event Feedback Endpoints (Phase 12)
// ==========================================
const feedbackRoutes = require('./feedbackRoutes');
router.use('/:eventId/feedback', feedbackRoutes);

// ==========================================
// Event Analytics Endpoints (Phase 13)
// ==========================================
const { getEventAnalytics } = require('../controllers/analyticsController');
const { eventIdParamSchema: analyticsEventIdSchema } = require('../validators/analyticsValidators');
router.get(
  '/:eventId/analytics',
  authenticate,
  authorize('organizer', 'admin'),
  validate(analyticsEventIdSchema),
  getEventAnalytics
);

// ==========================================
// Event AI Description Endpoints (Phase 14)
// ==========================================
const { generateEventDescription } = require('../controllers/aiController');
const { createRateLimiter } = require('../middleware/rateLimiter');
const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Gemini AI rate limit reached. Please wait a moment before trying again.',
  code: 'AI_RATE_LIMIT_EXCEEDED',
});

router.post(
  '/:eventId/ai-description',
  aiLimiter,
  authenticate,
  authorize('organizer', 'admin'),
  generateEventDescription
);

module.exports = router;
