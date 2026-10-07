const express = require('express');
const {
  create,
  list,
  getById,
  update,
  addOrganizer,
  deleteOrganizer,
  getMyClubs,
} = require('../controllers/clubController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createClubSchema,
  updateClubSchema,
  assignOrganizerSchema,
  removeOrganizerSchema,
} = require('../validators/clubValidators');

const router = express.Router();

// Public / Authenticated discovery
router.get('/', list);
router.get('/my-clubs', authenticate, authorize('organizer', 'admin'), getMyClubs);
router.get('/:id', getById);

// Admin-Only Club Operations
router.post('/', authenticate, authorize('admin'), validate(createClubSchema), create);
router.put('/:id', authenticate, authorize('admin'), validate(updateClubSchema), update);
router.post('/:id/organizers', authenticate, authorize('admin'), validate(assignOrganizerSchema), addOrganizer);
router.delete('/:id/organizers/:userId', authenticate, authorize('admin'), validate(removeOrganizerSchema), deleteOrganizer);

module.exports = router;
