const express = require('express');
const router = express.Router();
const {
  getAllParents,
  getParentById,
  createParent,
  updateParent,
  archiveParent,
  restoreParent,
} = require('../controllers/parents.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Parents Routes
 * 
 * Base path: /api/parents
 * 
 * All routes require authentication and admin role
 * 
 * Routes:
 * - GET / - Get all parents (with pagination, search, filtering)
 * - GET /:id - Get single parent by ID
 * - POST / - Create new parent
 * - PUT /:id - Update parent
 * - DELETE /:id - Archive parent (soft delete)
 * - PUT /:id/restore - Restore archived parent
 */

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// Get all parents with pagination, search, and filtering
router.get('/', getAllParents);

// Get single parent by ID
router.get('/:id', getParentById);

// Create new parent
router.post('/', createParent);

// Update parent
router.put('/:id', updateParent);

// Archive parent (soft delete)
router.delete('/:id', archiveParent);

// Restore archived parent
router.put('/:id/restore', restoreParent);

module.exports = router;

