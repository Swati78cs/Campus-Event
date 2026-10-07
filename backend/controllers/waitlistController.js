const waitlistService = require('../services/waitlistService');

/**
 * POST /api/events/:eventId/waitlist
 * Student joins event waitlist when event is full.
 */
const join = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await waitlistService.joinWaitlist(eventId, req.user);
    res.status(201).json({
      success: true,
      message: 'Successfully joined event waitlist',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:eventId/waitlist/me
 * Student gets their current waitlist status & position for an event.
 */
const getMyStatus = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await waitlistService.getMyWaitlistStatus(eventId, req.user);
    res.status(200).json({
      success: true,
      message: 'Waitlist status retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/events/:eventId/waitlist
 * Student leaves event waitlist.
 */
const leave = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await waitlistService.leaveWaitlist(eventId, req.user);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/waitlist/my-events
 * Student gets list of events they are waitlisted for.
 */
const getMyEvents = async (req, res, next) => {
  try {
    const result = await waitlistService.getMyWaitlistEvents(req.user, req.query);
    res.status(200).json({
      success: true,
      message: 'Waitlisted events retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:eventId/waitlist
 * Organizer / Admin views event waitlist.
 */
const getEventWaitlist = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await waitlistService.getEventWaitlist(eventId, req.user, req.query);
    res.status(200).json({
      success: true,
      message: 'Event waitlist retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/events/:eventId/waitlist/:studentId
 * Organizer / Admin removes a student from event waitlist.
 */
const removeStudent = async (req, res, next) => {
  try {
    const { eventId, studentId } = req.params;
    const result = await waitlistService.removeStudentFromWaitlist(eventId, studentId, req.user);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  join,
  getMyStatus,
  leave,
  getMyEvents,
  getEventWaitlist,
  removeStudent,
};
