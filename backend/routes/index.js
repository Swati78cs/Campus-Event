const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const clubRoutes = require('./clubRoutes');
const eventRoutes = require('./eventRoutes');
const registrationRoutes = require('./registrationRoutes');
const ticketRoutes = require('./ticketRoutes');
const volunteerRoutes = require('./volunteerRoutes');
const waitlistRoutes = require('./waitlistRoutes');
const notificationRoutes = require('./notificationRoutes');
const certificateRoutes = require('./certificateRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const aiRoutes = require('./aiRoutes');

const router = express.Router();

// Mount system and feature routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/clubs', clubRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/tickets', ticketRoutes);
router.use('/volunteers', volunteerRoutes);
router.use('/waitlist', waitlistRoutes);
router.use('/notifications', notificationRoutes);
router.use('/certificates', certificateRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
