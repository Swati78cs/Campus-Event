const {
  createClub,
  getAllClubs,
  getClubById,
  updateClub,
  assignOrganizer,
  removeOrganizer,
  getClubsForOrganizer,
  updateUserRole,
} = require('../services/clubService');
const { sendSuccess } = require('../utils/apiResponse');

const create = async (req, res, next) => {
  try {
    const club = await createClub(req.body);
    return sendSuccess(res, 201, 'Club created successfully.', { club });
  } catch (error) {
    next(error);
  }
};

const list = async (req, res, next) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const clubs = await getAllClubs(isAdmin);
    return sendSuccess(res, 200, 'Clubs retrieved successfully.', { clubs });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const club = await getClubById(req.params.id);
    return sendSuccess(res, 200, 'Club retrieved successfully.', { club });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const club = await updateClub(req.params.id, req.body);
    return sendSuccess(res, 200, 'Club updated successfully.', { club });
  } catch (error) {
    next(error);
  }
};

const addOrganizer = async (req, res, next) => {
  try {
    const club = await assignOrganizer(req.params.id, req.body.userId);
    return sendSuccess(res, 200, 'Organizer assigned to club successfully.', { club });
  } catch (error) {
    next(error);
  }
};

const deleteOrganizer = async (req, res, next) => {
  try {
    const club = await removeOrganizer(req.params.id, req.params.userId);
    return sendSuccess(res, 200, 'Organizer removed from club successfully.', { club });
  } catch (error) {
    next(error);
  }
};

const getMyClubs = async (req, res, next) => {
  try {
    const clubs = await getClubsForOrganizer(req.user._id);
    return sendSuccess(res, 200, 'Assigned clubs retrieved successfully.', { clubs });
  } catch (error) {
    next(error);
  }
};

const changeRole = async (req, res, next) => {
  try {
    const user = await updateUserRole(req.params.id, req.body.role, req.user._id);
    return sendSuccess(res, 200, `User role updated to ${user.role} successfully.`, { user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  list,
  getById,
  update,
  addOrganizer,
  deleteOrganizer,
  getMyClubs,
  changeRole,
};
