const geminiService = require('../services/geminiService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Generate event description using Gemini AI.
 * POST /api/ai/event-description
 * POST /api/events/:eventId/ai-description
 */
const generateEventDescription = async (req, res, next) => {
  try {
    const input = {
      ...req.body,
      ...(req.params.eventId ? { eventId: req.params.eventId } : {}),
    };

    const result = await geminiService.generateDescription(req.user, input);

    return sendSuccess(res, 200, 'Description generated successfully', result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateEventDescription,
};
