const express = require('express');
const router = express.Router();
const {
  getAllContentCreators,
  getContentCreatorById,
  getAccessAreas,
  createContentCreator,
  updateContentCreator,
  setContentCreatorAccess,
  setContentCreatorAccessBulk,
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
 *
 * GET  /access-areas        - the access checkboxes (key, label, help) and which ones current creators have
 * PUT  /access/bulk         - give several creators the same access list { ids, accessAreas }
 * PUT  /:id/access          - manage one creator's access list { accessAreas }
 */

router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllContentCreators);

// Registered before /:id so "access-areas" and "access" are never read as a creator id.
router.get('/access-areas', getAccessAreas);
router.put('/access/bulk', setContentCreatorAccessBulk);

router.get('/:id', getContentCreatorById);
router.post('/', createContentCreator);
router.put('/:id', updateContentCreator);
router.put('/:id/access', setContentCreatorAccess);
router.delete('/:id', archiveContentCreator);
router.put('/:id/restore', restoreContentCreator);

module.exports = router;
