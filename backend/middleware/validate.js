const { sendError } = require('../utils/apiResponse');

/**
 * Higher-order middleware function to validate incoming requests using a Zod schema.
 * @param {import('zod').ZodSchema} schema - Zod schema expecting shape { body?, query?, params? }
 */
const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!parsed.success) {
      const issueDetails = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return sendError(res, 400, 'Invalid request parameters', 'VALIDATION_ERROR', issueDetails);
    }

    // Assign sanitized data back to request
    if (parsed.data.body) req.body = parsed.data.body;
    if (parsed.data.query) req.query = parsed.data.query;
    if (parsed.data.params) req.params = parsed.data.params;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validate,
};
