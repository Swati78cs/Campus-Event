const ticketService = require('../services/ticketService');

/**
  * GET /api/tickets/my
  * Get paginated tickets for the authenticated student.
  */
const getMyTickets = async (req, res, next) => {
  try {
    const result = await ticketService.getMyTickets(req.user, req.query);
    res.status(200).json({
      success: true,
      message: 'Tickets retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
  * GET /api/tickets/:ticketId
  * Get ticket details by ID (verified ownership).
  */
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.ticketId, req.user);
    res.status(200).json({
      success: true,
      message: 'Ticket details retrieved successfully',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
  * GET /api/tickets/event/:eventId
  * Get active ticket for the authenticated student for a specific event.
  */
const getTicketForEvent = async (req, res, next) => {
  try {
    const ticket = await ticketService.getTicketForEvent(req.params.eventId, req.user);
    res.status(200).json({
      success: true,
      message: ticket ? 'Active ticket retrieved successfully' : 'No active ticket found for this event',
      data: { ticket },
    });
  } catch (error) {
    next(error);
  }
};

/**
  * GET /api/tickets/token/:token
  * Validate ticket token foundation (for Phase 8 verification foundation).
  */
const validateTicketToken = async (req, res, next) => {
  try {
    const validationResult = await ticketService.validateTicketToken(req.params.token);
    res.status(200).json({
      success: true,
      message: 'Ticket token verified successfully',
      data: validationResult,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyTickets,
  getTicketById,
  getTicketForEvent,
  validateTicketToken,
};
