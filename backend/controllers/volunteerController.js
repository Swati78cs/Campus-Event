const volunteerService = require('../services/volunteerService');
const VolunteerAssignment = require('../models/VolunteerAssignment');

/**
 * GET /api/volunteers/eligible-users
 * Search active users eligible for assignment (Organizers & Admins only).
 */
const searchEligible = async (req, res, next) => {
  try {
    const { search = '', limit = 10 } = req.query;
    const users = await volunteerService.searchEligibleUsers(search, parseInt(limit, 10));
    res.status(200).json({
      success: true,
      message: 'Eligible users retrieved successfully',
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/events/:eventId/volunteers
 * Assign volunteer to an event.
 */
const assign = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body;
    const assignment = await volunteerService.assignVolunteer(eventId, userId, req.user);
    res.status(201).json({
      success: true,
      message: 'Volunteer assigned successfully',
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/events/:eventId/volunteers
 * List volunteers assigned to an event.
 */
const getVolunteers = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { status = 'active' } = req.query;
    const result = await volunteerService.getEventVolunteers(eventId, req.user, status);
    res.status(200).json({
      success: true,
      message: 'Event volunteers retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/events/:eventId/volunteers/:userId
 * Remove a volunteer from an event (audit trail preserved).
 */
const remove = async (req, res, next) => {
  try {
    const { eventId, userId } = req.params;
    const assignment = await volunteerService.removeVolunteer(eventId, userId, req.user);
    res.status(200).json({
      success: true,
      message: 'Volunteer removed successfully',
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/volunteers/my-events
 * List active events assigned to the authenticated user.
 */
const getMyEvents = async (req, res, next) => {
  try {
    const result = await volunteerService.getMyAssignedEvents(req.user, req.query);
    res.status(200).json({
      success: true,
      message: 'Assigned events retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/volunteers/status
 * Check if the authenticated user has any active volunteer assignments (for navbar/dashboard badge).
 */
const getMyVolunteerStatus = async (req, res, next) => {
  try {
    const activeCount = await VolunteerAssignment.countDocuments({
      user: req.user._id,
      status: 'active',
    });
    res.status(200).json({
      success: true,
      message: 'Volunteer status retrieved successfully',
      data: {
        hasActiveAssignments: activeCount > 0,
        activeCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchEligible,
  assign,
  getVolunteers,
  remove,
  getMyEvents,
  getMyVolunteerStatus,
};
