const {
  createEvent,
  getEventById,
  getAuthorizedEvents,
  discoverEvents,
  getPublicEventById,
  updateEvent,
  publishEvent,
  cancelEvent,
} = require('../services/eventService');
const { sendSuccess } = require('../utils/apiResponse');

const discover = async (req, res, next) => {
  try {
    const result = await discoverEvents(req.query);
    return sendSuccess(res, 200, 'Events fetched successfully.', result);
  } catch (error) {
    next(error);
  }
};

const getPublicById = async (req, res, next) => {
  try {
    const event = await getPublicEventById(req.params.id);
    return sendSuccess(res, 200, 'Event retrieved successfully.', { event });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const event = await createEvent(req.body, req.user);
    return sendSuccess(res, 201, 'Event created successfully.', { event });
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const events = await getAuthorizedEvents(req.user);
    return sendSuccess(res, 200, 'Events retrieved successfully.', { events });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const event = await getEventById(req.params.id);
    return sendSuccess(res, 200, 'Event retrieved successfully.', { event });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const event = await updateEvent(req.params.id, req.body, req.user);
    return sendSuccess(res, 200, 'Event updated successfully.', { event });
  } catch (error) {
    next(error);
  }
};

const publish = async (req, res, next) => {
  try {
    const event = await publishEvent(req.params.id, req.user);
    return sendSuccess(res, 200, 'Event published successfully.', { event });
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const event = await cancelEvent(req.params.id, req.body.reason, req.user);
    return sendSuccess(res, 200, 'Event cancelled successfully.', { event });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  discover,
  getPublicById,
  create,
  list,
  getById,
  update,
  publish,
  cancel,
};
