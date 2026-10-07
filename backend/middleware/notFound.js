const { sendError } = require('../utils/apiResponse');

/**
 * 404 Handler for undefined API routes.
 */
const notFoundHandler = (req, res) => {
  return sendError(
    res,
    404,
    `API endpoint not found: ${req.method} ${req.originalUrl}`,
    'NOT_FOUND',
    {
      path: req.originalUrl,
      method: req.method,
    }
  );
};

module.exports = {
  notFoundHandler,
};
