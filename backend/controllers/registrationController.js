const {
  registerForEvent,
  cancelRegistration,
  getMyRegistrationForEvent,
  getMyEvents,
  getEventRegistrations,
} = require('../services/registrationService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Student registers for an event.
 */
const register = async (req, res, next) => {
  try {
    const result = await registerForEvent(req.params.eventId, req.user);
    return sendSuccess(res, 201, 'Registration confirmed successfully!', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Student cancels their active registration.
 */
const cancel = async (req, res, next) => {
  try {
    const result = await cancelRegistration(req.params.eventId, req.user);
    return sendSuccess(res, 200, 'Registration cancelled successfully.', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Student gets their registration status for a specific event.
 */
const getMyRegistration = async (req, res, next) => {
  try {
    const registration = await getMyRegistrationForEvent(req.params.eventId, req.user);
    return sendSuccess(res, 200, 'Registration retrieved.', { registration });
  } catch (error) {
    next(error);
  }
};

/**
 * Student gets all events they registered for.
 */
const getMyEventsList = async (req, res, next) => {
  try {
    const result = await getMyEvents(req.user, req.query);
    return sendSuccess(res, 200, 'My events retrieved.', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Organizer/Admin gets registrations list for an event.
 */
const getEventAttendees = async (req, res, next) => {
  try {
    const result = await getEventRegistrations(req.params.eventId, req.user, req.query);
    return sendSuccess(res, 200, 'Event registrations retrieved.', result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  cancel,
  getMyRegistration,
  getMyEventsList,
  getEventAttendees,
};
