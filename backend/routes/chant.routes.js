const express = require('express');
const router = express.Router();
const {
  createChant,
  getAllChants,
  getChantById,
  updateChant,
  deleteChant,
} = require('../controllers/chant.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadChant, uploadChantUpdate } = require('../middleware/upload');

/**
 * Chant Routes
 * 
 * Base path: /api/chants
 * 
 * All routes require authentication and admin/teacher role
 * 
 * Routes:
 * - POST / - Create new chant (with optional audio, optional SCORM file, and optional cover image upload)
 * - GET / - Get all chants (with filtering and pagination)
 * - GET /:id - Get single chant by ID
 * - PUT /:id - Update chant (title, description, instructions, coverImage, duration, starsAwarded)
 * - DELETE /:id - Delete chant (hard delete)
 */

// All routes require authentication
router.use(protect);

// All routes require admin/teacher role
router.use(authorize('admin', 'teacher'));

// Create new chant (with optional audio, optional SCORM file, and optional cover image upload)
router.post('/', uploadChant, createChant);

// Get all chants
router.get('/', getAllChants);

// Get single chant by ID
router.get('/:id', getChantById);

// Update chant (with optional cover image upload, no audio/SCORM files)
router.put('/:id', uploadChantUpdate, updateChant);

// Delete chant
router.delete('/:id', deleteChant);

module.exports = router;
