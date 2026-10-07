/**
 * Standard API Response utilities adhering to the approved project specification.
 */

const sendSuccess = (res, statusCode = 200, message = 'Operation successful', data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, statusCode = 500, message = 'An error occurred', code = 'INTERNAL_ERROR', details = {}) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      details,
    },
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
