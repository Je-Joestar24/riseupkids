const express = require('express');
const router = express.Router();
const {
  getAllChildren,
  getChildById,
  createChild,
  updateChild,
  deleteChild,
  restoreChild,
  getChildProfile,
} = require('../controllers/children.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Children Routes
 * 
 * Base path: /api/children
 * 
 * All routes require authentication and parent role
 * 
 * Routes:
 * - GET / - Get all children of logged-in parent
 * - GET /:id - Get single child by ID
 * - POST / - Create new child profile
 * - PUT /:id - Update child profile
 * - DELETE /:id - Delete child profile (soft delete)
 * - PUT /:id/restore - Restore archived child profile
 */

// All routes require authentication
router.use(protect);

// All routes require parent role
router.use(authorize('parent'));

// Get all children of logged-in parent
router.get('/', getAllChildren);

// Get single child by ID
router.get('/:id', getChildById);

// Get child profile with full stats, badges, and level info
router.get('/:id/profile', getChildProfile);

// Create new child profile
router.post('/', createChild);

// Update child profile
router.put('/:id', updateChild);

// Delete child profile (soft delete)
router.delete('/:id', deleteChild);

// Restore archived child profile
router.put('/:id/restore', restoreChild);

module.exports = router;

