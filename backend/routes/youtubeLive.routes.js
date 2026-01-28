const express = require('express');
const router = express.Router();
const {
  getAuthUrl,
  handleOAuthCallback,
  getConnectionStatus,
  disconnectYouTube,
  createLiveStream,
} = require('../controllers/youtubeLive.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * YouTube Live Routes
 * 
 * Base path: /api/youtube
 * 
 * OAuth routes:
 * - GET /oauth/url - Get OAuth URL (Teacher/Admin only)
 * - GET /oauth/callback - OAuth callback (Public, called by Google)
 * - GET /status - Check connection status (Teacher/Admin only)
 * - POST /disconnect - Disconnect YouTube account (Teacher/Admin only)
 * 
 * Live stream routes:
 * - POST /live/create - Create live stream (Teacher/Admin only)
 */

// OAuth routes
router.get('/oauth/url', protect, authorize('teacher', 'admin'), getAuthUrl);
router.get('/oauth/callback', handleOAuthCallback); // Public - called by Google
router.get('/status', protect, authorize('teacher', 'admin'), getConnectionStatus);
router.post('/disconnect', protect, authorize('teacher', 'admin'), disconnectYouTube);

// Live stream routes
router.post('/live/create', protect, authorize('teacher', 'admin'), createLiveStream);

module.exports = router;
