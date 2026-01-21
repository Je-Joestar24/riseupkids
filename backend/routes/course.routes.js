const express = require('express');
const router = express.Router();
const {
  createActivityGroup,
  getActivityGroupById,
} = require('../controllers/course.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Course/Activity Group Routes
 * 
 * Base path: /api/courses
 * 
 * All routes require authentication and admin/teacher role
 * 
 * Routes:
 * - POST /activity-groups - Create new activity group
 * - GET /activity-groups/:id - Get activity group with activities
 */

// All routes require authentication
router.use(protect);

// All routes require admin/teacher role
router.use(authorize('admin', 'teacher'));

// Create new activity group
router.post('/activity-groups', createActivityGroup);

// Get activity group with activities
router.get('/activity-groups/:id', getActivityGroupById);

module.exports = router;

