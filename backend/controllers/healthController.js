const { getDBStatus } = require('../config/db');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Health check controller.
 * Returns server operational status and safe database connection state without leaking credentials.
 */
const getHealth = (req, res) => {
  const dbStatus = getDBStatus();
  const isHealthy = dbStatus === 'connected';

  const healthData = {
    status: isHealthy ? 'healthy' : 'degraded',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
    },
  };

  return sendSuccess(
    res,
    200,
    isHealthy ? 'Campus Events API is healthy' : 'Campus Events API is running with degraded services',
    healthData
  );
};

module.exports = {
  getHealth,
};
