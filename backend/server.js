const app = require('./app');
const { env } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

let server;

const startServer = async () => {
  try {
    // Attempt database connection
    await connectDB();

    server = app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`[Server] Campus Events API running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`[Server] Health check endpoint available at http://localhost:${env.PORT}/api/health`);
    });
  } catch (error) {
    console.error(`[Server] Startup failure: ${error.message}`);
    process.exit(1);
  }
};

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      await disconnectDB();
      console.log('[Server] Graceful shutdown complete');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
