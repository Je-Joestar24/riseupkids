const express = require('express');
const router = express.Router();
const {
  createActivity,
  getAllActivities,
} = require('../controllers/activity.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadActivityMedia } = require('../middleware/upload');

/**
 * Activity Routes
 * 
 * Base path: /api/activities
 * 
 * All routes require authentication and admin role
 * 
 * Routes:
 * - POST / - Create new activity (with file uploads)
 * - GET / - Get all activities (with filtering and pagination)
 */

// All routes require authentication
router.use(protect);

// All routes require admin role
router.use(authorize('admin'));

// Create new activity (with file upload support)
router.post('/', uploadActivityMedia, createActivity);

// Get all activities
router.get('/', getAllActivities);

module.exports = router;

