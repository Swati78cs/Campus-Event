const express = require('express');
const { generateEventDescription } = require('../controllers/aiController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { generateEventDescriptionSchema } = require('../validators/aiValidators');
const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Gemini AI rate limit reached. Please wait a moment before trying again.',
  code: 'AI_RATE_LIMIT_EXCEEDED',
});

// POST /api/ai/event-description - Generate event description via Gemini
router.post(
  '/event-description',
  aiLimiter,
  authenticate,
  authorize('organizer', 'admin'),
  validate(generateEventDescriptionSchema),
  generateEventDescription
);

module.exports = router;
