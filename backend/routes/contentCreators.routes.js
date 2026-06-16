const express = require('express');
const router = express.Router();
const {
  getAllContentCreators,
  getContentCreatorById,
  createContentCreator,
  updateContentCreator,
  archiveContentCreator,
  restoreContentCreator,
} = require('../controllers/contentCreators.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Content Creators Routes
 *
 * Base path: /api/content-creators
 *
 * All routes require authentication and admin role.
 * Content creator accounts can ONLY be created/managed by admins.
 */

router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllContentCreators);
router.get('/:id', getContentCreatorById);
router.post('/', createContentCreator);
router.put('/:id', updateContentCreator);
router.delete('/:id', archiveContentCreator);
router.put('/:id/restore', restoreContentCreator);

module.exports = router;
