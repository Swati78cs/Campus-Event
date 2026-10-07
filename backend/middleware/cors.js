const { env } = require('../config/env');

/**
 * Secure CORS middleware allowing configured frontend origin with credentials support.
 */
const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigin = env.FRONTEND_URL;

  // In development, allow localhost/127.0.0.1 variants if matching
  if (
    origin &&
    (origin === allowedOrigin ||
      (env.NODE_ENV === 'development' &&
        (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
};

module.exports = {
  corsMiddleware,
};
