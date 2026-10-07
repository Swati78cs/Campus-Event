const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables safely
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    console.warn(`[Seed] Note: Could not load .env file directly: ${err.message}`);
  }
}

const { env } = require('../config/env');
const User = require('../models/User');

const seedAdmin = async () => {
  const adminName = process.env.ADMIN_NAME || 'Campus Administrator';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@campus.edu').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';

  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);

  console.log(`[Seed] Checking for existing admin account with email: ${adminEmail}`);
  let admin = await User.findOne({ email: adminEmail });

  if (admin) {
    console.log('[Seed] Admin account already exists. Ensuring admin role and active status...');
    admin.name = adminName;
    admin.role = 'admin';
    admin.isActive = true;
    admin.passwordHash = await User.hashPassword(adminPassword);
    await admin.save();
    console.log('[Seed] Admin account updated successfully.');
  } else {
    console.log('[Seed] Creating new initial Admin account...');
    const passwordHash = await User.hashPassword(adminPassword);
    admin = await User.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'admin',
      isActive: true,
    });
    console.log('[Seed] First Admin created successfully.');
  }

  console.log(`[Seed] Admin bootstrap finished. Email: ${admin.email}, Role: ${admin.role}`);
  await mongoose.disconnect();
  console.log('[Seed] Disconnected from MongoDB.');
  process.exit(0);
};

seedAdmin().catch(async (error) => {
  console.error(`[Seed] Admin bootstrap failed: ${error.message}`);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
