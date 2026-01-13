const express = require('express');
const router = express.Router();
const {
  markVideoWatched,
  getVideoWatchStatus,
  getChildVideoWatches,
  resetVideoWatch,
} = require('../controllers/videoWatch.controller');
const { protect } = require('../middleware/auth');

/**
 * Video Watch Routes
 * 
 * Base path: /api/video-watch
 * 
 * All routes require authentication (parent or admin)
 * 
 * Routes:
 * - POST   /:videoId/child/:childId        - Mark video as watched (completed)
 * - GET    /:videoId/child/:childId        - Get video watch status for a child
 * - GET    /child/:childId                 - Get all video watch statuses for a child
 * - DELETE /:videoId/child/:childId        - Reset video watch count (admin/parent)
 */

// All routes require authentication
router.use(protect);

// Mark video as watched
router.post('/:videoId/child/:childId', markVideoWatched);

// Get video watch status
router.get('/:videoId/child/:childId', getVideoWatchStatus);

// Get all video watches for a child
router.get('/child/:childId', getChildVideoWatches);

// Reset video watch count
router.delete('/:videoId/child/:childId', resetVideoWatch);

module.exports = router;
