const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

/**
 * Signs a JWT with user identifier and role.
 * @param {object} payload - { id, role }
 * @param {string} [expiresIn='7d']
 * @returns {string}
 */
const signToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn });
};

/**
 * Verifies a JWT and returns decoded payload.
 * @param {string} token
 * @returns {object}
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

module.exports = {
  signToken,
  verifyToken,
};
