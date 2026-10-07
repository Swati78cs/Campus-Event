const { sendError } = require('../utils/apiResponse');
const { env } = require('../config/env');

const redactSecrets = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/mongodb(\+srv)?:\/\/[^@\s]+@/gi, 'mongodb$1://[REDACTED]@')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/Bearer\s+[0-9A-Za-z-_.]+/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/(?:password|secret|key)=[^&\s;]+/gi, '$1=[REDACTED]');
};

/**
 * Centralized Express Error Handling Middleware.
 * Captures Zod, syntax, CastErrors, custom errors, and uncaught exceptions.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Safe console error log with secrets redacted
  const safeLogMessage = redactSecrets(err.message || String(err));
  console.error(`[Error] [${req.method} ${req.originalUrl}]:`, safeLogMessage);

  // JSON syntax error from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 400, 'Malformed JSON in request body', 'BAD_REQUEST', {
      details: redactSecrets(err.message),
    });
  }

  // Zod validation error handled generically
  if (err.name === 'ZodError') {
    return sendError(res, 400, 'Validation failed', 'VALIDATION_ERROR', err.errors || err.issues);
  }

  // Mongoose CastError (e.g. invalid ObjectId format in queries/params)
  if (err.name === 'CastError') {
    return sendError(
      res,
      400,
      `Invalid resource identifier format for '${err.path}'`,
      'INVALID_ID',
      { path: err.path, value: String(err.value).slice(0, 50) }
    );
  }

  // MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return sendError(
      res,
      409,
      `An account with this ${field} already exists.`,
      'DUPLICATE_RESOURCE',
      { field }
    );
  }

  // Custom status code if provided
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR');
  const rawMessage = err.message || 'An unexpected server error occurred';

  // In production, mask 500 messages if sensitive
  const clientMessage = env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal server error'
    : redactSecrets(rawMessage);

  return sendError(res, statusCode, clientMessage, errorCode, {
    ...(err.details ? JSON.parse(JSON.stringify(err.details)) : {}),
  });
};

module.exports = {
  errorHandler,
};
