const { updateUserStatus, listUsers } = require('../services/authService');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Admin handler: activate or deactivate user account.
 */
const changeUserStatus = async (req, res, next) => {
  try {
    const updatedUser = await updateUserStatus(req.params.id, req.body.isActive, req.user._id);
    const actionText = updatedUser.isActive ? 'activated' : 'deactivated';

    return sendSuccess(res, 200, `User account ${actionText} successfully.`, {
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin handler: list users for administrative review.
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await listUsers();
    return sendSuccess(res, 200, 'Users retrieved successfully.', {
      users,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  changeUserStatus,
  getAllUsers,
};
