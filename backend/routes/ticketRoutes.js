const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  ticketIdParamSchema,
  tokenParamSchema,
  myTicketsQuerySchema,
} = require('../validators/ticketValidators');
const { eventIdParamSchema } = require('../validators/registrationValidators');

// All ticket operations require authentication
router.use(authenticate);

// Student: List my tickets
router.get(
  '/my',
  authorize('student'),
  validate(myTicketsQuerySchema),
  ticketController.getMyTickets
);

// Student: Get active ticket for an event
router.get(
  '/event/:eventId',
  authorize('student'),
  validate(eventIdParamSchema),
  ticketController.getTicketForEvent
);

// Validation Foundation: Lookup ticket by token (available for students, organizers, and admins)
router.get(
  '/token/:token',
  authorize('student', 'organizer', 'admin'),
  validate(tokenParamSchema),
  ticketController.validateTicketToken
);

// Authenticated: Get ticket by ID (student ownership enforced in service, organizers/admins permitted for assigned events)
router.get(
  '/:ticketId',
  validate(ticketIdParamSchema),
  ticketController.getTicketById
);

module.exports = router;
