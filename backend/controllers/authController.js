const { registerStudent, loginUser, updateProfile } = require('../services/authService');
const { setAuthCookie, clearAuthCookie } = require('../utils/cookies');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Handle student registration.
 */
const register = async (req, res, next) => {
  try {
    const { user, token } = await registerStudent(req.body);
    setAuthCookie(res, token);

    return sendSuccess(res, 201, 'Registration successful. Welcome to Campus Events!', {
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user login across all roles.
 */
const login = async (req, res, next) => {
  try {
    const { user, token } = await loginUser(req.body);
    setAuthCookie(res, token);

    return sendSuccess(res, 200, 'Login successful.', {
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle logout by invalidating authentication cookie.
 */
const logout = async (req, res) => {
  clearAuthCookie(res);
  return sendSuccess(res, 200, 'Logged out successfully.');
};

/**
 * Return current authenticated user profile.
 */
const getMe = async (req, res) => {
  return sendSuccess(res, 200, 'User profile retrieved successfully.', {
    user: req.user,
  });
};

/**
 * Handle user profile updates.
 */
const editProfile = async (req, res, next) => {
  try {
    const updatedUser = await updateProfile(req.user._id, req.body);
    return sendSuccess(res, 200, 'Profile updated successfully.', {
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  editProfile,
};
