const express = require('express');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  trackRoundStarted,
  trackTargetFound,
  trackGameCompleted,
  getStarCamEvents,
} = require('../controllers/starCam.controller');

/**
 * Star Cam analytics event routes
 *
 * Base path: /api/star-cam
 *
 * Parent routes:
 * - POST /events/round-started
 * - POST /events/target-found
 * - POST /events/game-completed
 * - GET  /events
 *
 * Admin routes:
 * - GET /events
 */

router.post('/events/round-started', protect, authorize('parent', 'admin'), trackRoundStarted);
router.post('/events/target-found', protect, authorize('parent', 'admin'), trackTargetFound);
router.post('/events/game-completed', protect, authorize('parent', 'admin'), trackGameCompleted);
router.get('/events', protect, authorize('parent', 'admin'), getStarCamEvents);

module.exports = router;
