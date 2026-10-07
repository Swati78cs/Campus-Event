const express = require('express');
const { register, login, logout, getMe, editProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
} = require('../validators/authValidators');

const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many authentication attempts. Please try again later.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});

// Public Authentication Endpoints
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);

// Protected User Endpoints
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validate(profileUpdateSchema), editProfile);

module.exports = router;
