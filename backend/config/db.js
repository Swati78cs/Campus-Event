const mongoose = require('mongoose');
const { env } = require('./env');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = conn.connection.readyState === 1;
    console.log(`[Database] MongoDB connected successfully to host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] MongoDB connection failed: ${error.message}`);
    // In development or testing, throw error to let server.js handle it cleanly
    throw error;
  }
};

const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB disconnected cleanly');
  }
};

const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

module.exports = {
  connectDB,
  disconnectDB,
  getDBStatus,
};
