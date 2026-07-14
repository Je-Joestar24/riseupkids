const express = require('express');
const router = express.Router();
const {
  getAllChildren,
  getChildById,
  createChild,
  updateChild,
  requestChildDeletion,
  getChildProfile,
} = require('../controllers/children.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Children Routes
 *
 * Base path: /api/children
 *
 * All routes require authentication and parent role
 */

router.use(protect);
router.use(authorize('parent'));

router.get('/', getAllChildren);
router.get('/:id', getChildById);
router.get('/:id/profile', getChildProfile);
router.post('/', createChild);
router.put('/:id', updateChild);
router.post('/:id/request-deletion', requestChildDeletion);

module.exports = router;
