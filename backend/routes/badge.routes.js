const express = require('express');
const router = express.Router();
const { getAllBadges, getChildLatestBadges } = require('../controllers/badge.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Badge Routes
 * 
 * Base path: /api/badges
 * 
 * All routes require authentication and parent role
 * 
 * Routes:
 * - GET / - Get all badges (for display)
 * - GET /child/:childId/latest - Get child's latest badges earned (last week, limit 5)
 */

// All routes require authentication
router.use(protect);

// All routes require parent role
router.use(authorize('parent'));

// Get all badges
router.get('/', getAllBadges);

// Get child's latest badges
router.get('/child/:childId/latest', getChildLatestBadges);

module.exports = router;
