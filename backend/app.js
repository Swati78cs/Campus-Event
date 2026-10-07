const express = require('express');
const { corsMiddleware } = require('./middleware/cors');
const { securityHeaders } = require('./middleware/securityHeaders');
const { mongoSanitize } = require('./middleware/mongoSanitize');
const { notFoundHandler } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

const app = express();

// Disable Express technology signature
app.disable('x-powered-by');

// Native security headers
app.use(securityHeaders);

// Global middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize);
app.use(corsMiddleware);

// Mount central API routes with approved /api prefix
app.use('/api', apiRoutes);

// Catch unknown routes under /api and globally
app.use(notFoundHandler);

// Central error handling middleware
app.use(errorHandler);

module.exports = app;
