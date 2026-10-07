const feedbackService = require('../services/feedbackService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Submit feedback for a completed event (eligible attendees only).
 * POST /api/events/:eventId/feedback
 */
const submitFeedback = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { rating, comment } = req.body;

    const feedback = await feedbackService.submitFeedback(eventId, req.user, {
      rating,
      comment,
    });

    return sendSuccess(res, 201, 'Feedback submitted successfully', { feedback });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve student's own feedback and eligibility for an event.
 * GET /api/events/:eventId/feedback/my
 */
const getMyFeedback = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const data = await feedbackService.getStudentFeedback(eventId, req.user);

    return sendSuccess(res, 200, 'Feedback status retrieved', data);
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve paginated event feedback and stats (organizers and admins).
 * GET /api/events/:eventId/feedback
 */
const getEventFeedback = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { page, limit, rating } = req.query;

    const result = await feedbackService.getEventFeedback(eventId, req.user, {
      page,
      limit,
      rating,
    });

    return sendSuccess(res, 200, 'Event feedback retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getMyFeedback,
  getEventFeedback,
};
