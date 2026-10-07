const Club = require('../models/Club');
const User = require('../models/User');

class ClubError extends Error {
  constructor(message, code = 'CLUB_ERROR', statusCode = 400, details = {}) {
    super(message);
    this.name = 'ClubError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Admin: Create a new campus club.
 */
const createClub = async ({ name, description, category, organizers = [] }) => {
  const trimmedName = name.trim();

  // Enforce uniqueness
  const existingClub = await Club.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
  if (existingClub) {
    throw new ClubError(
      'A club with this name already exists.',
      'CLUB_ALREADY_EXISTS',
      409
    );
  }

  // Validate initial organizers if provided
  if (organizers.length > 0) {
    for (const orgId of organizers) {
      const user = await User.findById(orgId);
      if (!user || !user.isActive) {
        throw new ClubError(`Invalid or inactive user specified as organizer: ${orgId}`, 'INVALID_ORGANIZER', 400);
      }
      // Ensure user has organizer role
      if (user.role !== 'organizer' && user.role !== 'admin') {
        user.role = 'organizer';
        await user.save();
      }
    }
  }

  const club = await Club.create({
    name: trimmedName,
    description: description.trim(),
    category,
    organizers,
    isActive: true,
  });

  return await club.populate('organizers', 'name email role isActive');
};

/**
 * Retrieve all clubs.
 * Public users see active clubs; admins see all.
 */
const getAllClubs = async (isAdmin = false) => {
  const filter = isAdmin ? {} : { isActive: true };
  return await Club.find(filter)
    .populate('organizers', 'name email role isActive')
    .sort({ name: 1 });
};

/**
 * Retrieve a specific club by ID.
 */
const getClubById = async (clubId) => {
  const club = await Club.findById(clubId).populate('organizers', 'name email role isActive');
  if (!club) {
    throw new ClubError('Club not found.', 'CLUB_NOT_FOUND', 404);
  }
  return club;
};

/**
 * Admin: Update club details.
 */
const updateClub = async (clubId, updateData) => {
  const club = await Club.findById(clubId);
  if (!club) {
    throw new ClubError('Club not found.', 'CLUB_NOT_FOUND', 404);
  }

  if (updateData.name && updateData.name.trim() !== club.name) {
    const trimmedName = updateData.name.trim();
    const existing = await Club.findOne({
      _id: { $ne: clubId },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });
    if (existing) {
      throw new ClubError('A club with this name already exists.', 'CLUB_ALREADY_EXISTS', 409);
    }
    club.name = trimmedName;
  }

  if (updateData.description !== undefined) club.description = updateData.description.trim();
  if (updateData.category !== undefined) club.category = updateData.category;
  if (updateData.isActive !== undefined) club.isActive = updateData.isActive;

  await club.save();
  return await club.populate('organizers', 'name email role isActive');
};

/**
 * Admin: Assign an organizer to a club.
 * Automatically elevates student role to 'organizer' if needed.
 */
const assignOrganizer = async (clubId, userId) => {
  const club = await Club.findById(clubId);
  if (!club) {
    throw new ClubError('Club not found.', 'CLUB_NOT_FOUND', 404);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ClubError('User not found.', 'USER_NOT_FOUND', 404);
  }

  if (!user.isActive) {
    throw new ClubError('Cannot assign a deactivated user as an organizer.', 'USER_INACTIVE', 400);
  }

  // Check if already an organizer of this club
  const alreadyAssigned = club.organizers.some(
    (existingId) => existingId.toString() === userId.toString()
  );

  if (alreadyAssigned) {
    throw new ClubError('User is already an organizer of this club.', 'ALREADY_ASSIGNED', 400);
  }

  // Promote user role to 'organizer' if currently 'student'
  if (user.role === 'student') {
    user.role = 'organizer';
    await user.save();
  }

  club.organizers.push(user._id);
  await club.save();

  return await club.populate('organizers', 'name email role isActive');
};

/**
 * Admin: Remove an organizer from a club.
 */
const removeOrganizer = async (clubId, userId) => {
  const club = await Club.findById(clubId);
  if (!club) {
    throw new ClubError('Club not found.', 'CLUB_NOT_FOUND', 404);
  }

  const initialLength = club.organizers.length;
  club.organizers = club.organizers.filter(
    (existingId) => existingId.toString() !== userId.toString()
  );

  if (club.organizers.length === initialLength) {
    throw new ClubError('User is not assigned to this club.', 'ORGANIZER_NOT_FOUND', 404);
  }

  await club.save();
  return await club.populate('organizers', 'name email role isActive');
};

/**
 * Organizer: Get clubs assigned to current user.
 */
const getClubsForOrganizer = async (organizerUserId) => {
  return await Club.find({
    organizers: organizerUserId,
    isActive: true,
  }).populate('organizers', 'name email role isActive');
};

/**
 * Admin: Change user role directly (e.g. promote Student to Organizer).
 */
const updateUserRole = async (userId, newRole, adminUserId) => {
  if (userId.toString() === adminUserId.toString()) {
    throw new ClubError('Administrators cannot alter their own role.', 'SELF_ROLE_CHANGE_PREVENTED', 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new ClubError('User not found.', 'USER_NOT_FOUND', 404);
  }

  user.role = newRole;
  await user.save();

  return user;
};

module.exports = {
  ClubError,
  createClub,
  getAllClubs,
  getClubById,
  updateClub,
  assignOrganizer,
  removeOrganizer,
  getClubsForOrganizer,
  updateUserRole,
};
