const User = require('../models/User');
const { signToken } = require('../utils/jwt');

class AuthError extends Error {
  constructor(message, code = 'AUTH_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Register a new student account.
 * Public registration strictly assigns the 'student' role.
 */
const registerStudent = async ({ name, email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check uniqueness
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AuthError(
      'An account with this email address already exists.',
      'EMAIL_ALREADY_EXISTS',
      409
    );
  }

  // Hash password using bcrypt
  const passwordHash = await User.hashPassword(password);

  // Force role to student for public registration
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: 'student',
    isActive: true,
  });

  const token = signToken({ id: user._id, role: user.role });

  return {
    user,
    token,
  };
};

/**
 * Authenticate user with email and password.
 * Safe generic error message prevents enumeration attacks.
 */
const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new AuthError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AuthError('Invalid email or password.', 'INVALID_CREDENTIALS', 401);
  }

  // Inactive users cannot log in
  if (!user.isActive) {
    throw new AuthError(
      'Your account has been deactivated. Please contact an administrator.',
      'ACCOUNT_INACTIVE',
      403
    );
  }

  const token = signToken({ id: user._id, role: user.role });

  return {
    user,
    token,
  };
};

/**
 * Update authenticated user's profile information.
 */
const updateProfile = async (userId, { name }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AuthError('User account not found.', 'USER_NOT_FOUND', 404);
  }

  user.name = name.trim();
  await user.save();

  return user;
};

/**
 * Admin action: update account active status (activation / deactivation).
 * Prevents administrator self-lockout.
 */
const updateUserStatus = async (targetUserId, isActive, adminUserId) => {
  if (targetUserId.toString() === adminUserId.toString()) {
    throw new AuthError(
      'Administrators cannot deactivate their own account.',
      'SELF_DEACTIVATION_PREVENTED',
      400
    );
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw new AuthError('Target user not found.', 'USER_NOT_FOUND', 404);
  }

  user.isActive = isActive;
  await user.save();

  return user;
};

/**
 * Admin action: list users (for administrative overview in Phase 1).
 */
const listUsers = async () => {
  return await User.find({}).sort({ createdAt: -1 });
};

module.exports = {
  AuthError,
  registerStudent,
  loginUser,
  updateProfile,
  updateUserStatus,
  listUsers,
};
