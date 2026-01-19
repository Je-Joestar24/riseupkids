const express = require('express');
const router = express.Router();
const {
  markExploreVideoWatched,
  getExploreVideoWatchStatus,
  getTotalStarsForVideoType,
  getVideoTypeProgress,
} = require('../controllers/exploreVideoWatch.controller');
const { protect } = require('../middleware/auth');

/**
 * Explore Video Watch Routes
 * 
 * Base path: /api/explore/videos
 * 
 * All routes require authentication (parent or admin)
 * 
 * Routes:
 * - POST   /:exploreContentId/watch/child/:childId                    - Mark explore video as watched (completed)
 * - GET    /:exploreContentId/watch-status/child/:childId             - Get explore video watch status for a child
 * - GET    /video-type/:videoType/total-stars/child/:childId          - Get total stars earned for a video type
 * - GET    /video-type/:videoType/progress/child/:childId             - Get progress (total videos and viewed videos) for a video type
 */

// All routes require authentication
router.use(protect);

// Get total stars for video type (MUST be before /:exploreContentId routes to avoid route conflict)
router.get('/video-type/:videoType/total-stars/child/:childId', getTotalStarsForVideoType);

// Get progress for video type (MUST be before /:exploreContentId routes to avoid route conflict)
router.get('/video-type/:videoType/progress/child/:childId', getVideoTypeProgress);

// Mark explore video as watched
router.post('/:exploreContentId/watch/child/:childId', markExploreVideoWatched);

// Get explore video watch status
router.get('/:exploreContentId/watch-status/child/:childId', getExploreVideoWatchStatus);

module.exports = router;
