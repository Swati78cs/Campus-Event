const { sendError } = require('../utils/apiResponse');

/**
 * Creates an in-memory sliding-window rate limiter middleware for sensitive endpoints.
 * Tracks client IP requests within a sliding window.
 * Requires zero external dependencies (no express-rate-limit, no Redis).
 *
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60,000 = 1 min)
 * @param {number} options.max - Max allowed requests per IP per window
 * @param {string} options.message - Human-friendly message when limit is exceeded
 * @param {string} options.code - Error code (default: 'RATE_LIMIT_EXCEEDED')
 */
const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 100,
  message = 'Too many requests. Please slow down and try again later.',
  code = 'RATE_LIMIT_EXCEEDED',
} = {}) => {
  const store = new Map();

  // Periodic cleanup of expired window records every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  // Unref interval so it does not block Node process exit during scripts
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    // Determine client IP safely
    const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    let record = store.get(ip);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      store.set(ip, record);
    } else {
      record.count += 1;
    }

    // Set standard rate limit headers
    const remaining = Math.max(0, max - record.count);
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader('Retry-After', retryAfterSeconds);
      return sendError(res, 429, message, code, {
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };
};

module.exports = {
  createRateLimiter,
};
