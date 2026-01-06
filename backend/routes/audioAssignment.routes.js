const express = require('express');
const router = express.Router();
const {
  createAudioAssignment,
  getAllAudioAssignments,
  getAudioAssignmentById,
  updateAudioAssignment,
  deleteAudioAssignment,
} = require('../controllers/audioAssignment.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadAudioAssignment, uploadAudioAssignmentUpdate } = require('../middleware/upload');

/**
 * Audio Assignment Routes
 * 
 * Base path: /api/audio-assignments
 * 
 * All routes require authentication and admin role
 * 
 * Routes:
 * - POST / - Create new audio assignment (with reference audio and cover image upload)
 * - GET / - Get all audio assignments (with filtering and pagination)
 * - GET /:id - Get single audio assignment by ID
 * - PUT /:id - Update audio assignment (title, description, instructions, coverImage, settings, isPublished)
 * - DELETE /:id - Delete audio assignment (hard delete)
 */

// All routes require authentication
router.use(protect);

// All routes require admin role
router.use(authorize('admin'));

// Create new audio assignment (with reference audio and cover image upload)
router.post('/', uploadAudioAssignment, createAudioAssignment);

// Get all audio assignments
router.get('/', getAllAudioAssignments);

// Get single audio assignment by ID
router.get('/:id', getAudioAssignmentById);

// Update audio assignment (with optional cover image upload, no reference audio)
router.put('/:id', uploadAudioAssignmentUpdate, updateAudioAssignment);

// Delete audio assignment
router.delete('/:id', deleteAudioAssignment);

module.exports = router;

