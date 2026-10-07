const mongoose = require('mongoose');
const { env } = require('../config/env');
const User = require('../models/User');

const seedUsers = async () => {
  await mongoose.connect(env.MONGODB_URI);

  // 1. Ensure Student
  let student = await User.findOne({ email: 'student@campus.edu' });
  if (!student) {
    const passwordHash = await User.hashPassword('StudentPass123!');
    student = await User.create({
      name: 'Sam Student',
      email: 'student@campus.edu',
      passwordHash,
      role: 'student',
      isActive: true,
    });
    console.log('[Seed] Created test Student: student@campus.edu');
  }

  // 2. Ensure Organizer
  let organizer = await User.findOne({ email: 'organizer@campus.edu' });
  if (!organizer) {
    const passwordHash = await User.hashPassword('OrgPass123!');
    organizer = await User.create({
      name: 'Olivia Organizer',
      email: 'organizer@campus.edu',
      passwordHash,
      role: 'organizer',
      isActive: true,
    });
    console.log('[Seed] Created test Organizer: organizer@campus.edu');
  }

  // 3. Ensure Admin
  let admin = await User.findOne({ email: 'admin@campus.edu' });
  if (!admin) {
    const passwordHash = await User.hashPassword('AdminPass123!');
    admin = await User.create({
      name: 'Campus Administrator',
      email: 'admin@campus.edu',
      passwordHash,
      role: 'admin',
      isActive: true,
    });
    console.log('[Seed] Created test Admin: admin@campus.edu');
  }

  console.log('[Seed] All test users ready.');
  await mongoose.disconnect();
};

seedUsers().catch(console.error);
