const express = require('express');
const router = express.Router();
const {
  createActivity,
  getAllActivities,
  getActivityById,
  updateActivity,
  archiveActivity,
  restoreActivity,
} = require('../controllers/activity.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadActivity, uploadActivityUpdate } = require('../middleware/upload');

/**
 * Activity Routes
 * 
 * Base path: /api/activities
 * 
 * All routes require authentication and admin role
 * 
 * Routes:
 * - POST / - Create new activity (with SCORM file and cover image upload)
 * - GET / - Get all activities (with filtering and pagination)
 * - GET /:id - Get single activity by ID
 * - PUT /:id - Update activity (title, description, coverImage, starsAwarded, isPublished)
 * - DELETE /:id - Archive activity (soft delete)
 * - PATCH /:id/restore - Restore archived activity
 */

// All routes require authentication
router.use(protect);

// All routes require admin role
router.use(authorize('admin'));

// Create new activity (with SCORM file and cover image upload)
router.post('/', uploadActivity, createActivity);

// Get all activities
router.get('/', getAllActivities);

// Get single activity by ID
router.get('/:id', getActivityById);

// Update activity (with optional cover image upload, no SCORM file)
router.put('/:id', uploadActivityUpdate, updateActivity);

// Archive activity
router.delete('/:id', archiveActivity);

// Restore archived activity
router.patch('/:id/restore', restoreActivity);

module.exports = router;

