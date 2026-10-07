const { parseCookies, COOKIE_NAME } = require('../utils/cookies');
const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/apiResponse');
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Authentication middleware.
 * Verifies JWT from HttpOnly cookie and validates active user state against MongoDB.
 */
const authenticate = async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    let token = cookies[COOKIE_NAME];

    // Optional Authorization header fallback for API testing
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 401, 'Authentication required. Please log in.', 'UNAUTHORIZED');
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 401, 'Your session has expired. Please log in again.', 'TOKEN_EXPIRED');
      }
      return sendError(res, 401, 'Invalid authentication token.', 'INVALID_TOKEN');
    }

    if (!decoded || !decoded.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return sendError(res, 401, 'Invalid authentication token payload.', 'INVALID_TOKEN');
    }

    // Always fetch fresh user from database to ensure current active status and role
    const user = await User.findById(decoded.id);

    if (!user) {
      return sendError(res, 401, 'User account no longer exists.', 'USER_NOT_FOUND');
    }

    // Inactive users lose access immediately even with a valid JWT
    if (!user.isActive) {
      return sendError(
        res,
        403,
        'Your account has been deactivated. Please contact an administrator.',
        'ACCOUNT_INACTIVE'
      );
    }

    // Attach fresh user to request
    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 500, 'Authentication check failed.', 'INTERNAL_ERROR', {
      details: error.message,
    });
  }
};

/**
 * Role-based authorization middleware.
 * @param  {...string} allowedRoles - Permitted roles (e.g. 'admin', 'organizer')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required.', 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        'Access denied: You do not have permission to access this resource.',
        'FORBIDDEN',
        {
          requiredRoles: allowedRoles,
          currentRole: req.user.role,
        }
      );
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
