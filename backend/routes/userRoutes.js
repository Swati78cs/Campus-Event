const express = require('express');
const { changeUserStatus, getAllUsers } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { userStatusUpdateSchema } = require('../validators/authValidators');

const router = express.Router();

const { changeRole } = require('../controllers/clubController');
const { updateUserRoleSchema } = require('../validators/clubValidators');

// Admin-Only User Management Endpoints
router.get('/', authenticate, authorize('admin'), getAllUsers);
router.patch('/:id/status', authenticate, authorize('admin'), validate(userStatusUpdateSchema), changeUserStatus);
router.patch('/:id/role', authenticate, authorize('admin'), validate(updateUserRoleSchema), changeRole);

module.exports = router;
