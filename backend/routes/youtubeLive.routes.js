const express = require('express');
const router = express.Router();
const {
  getAuthUrl,
  handleOAuthCallback,
  getConnectionStatus,
  disconnectYouTube,
  createLiveStream,
  getAllLives,
  getLiveById,
  archiveLive,
  deleteLive,
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
 * - GET /live - List lives (paginated, search) (Teacher/Admin only)
 * - GET /live/:id - Get one live (Teacher/Admin only, creator)
 * - PATCH /live/:id/archive - Archive live (Teacher/Admin only, creator)
 * - DELETE /live/:id - Delete live from LMS (Teacher/Admin only, creator)
 */

// OAuth routes (Admin only for setup)
router.get('/oauth/url', protect, authorize('admin'), getAuthUrl); // Admin only
router.get('/oauth/callback', handleOAuthCallback); // Public - called by Google
router.get('/status', protect, authorize('teacher', 'admin'), getConnectionStatus); // All can check status
router.post('/disconnect', protect, authorize('admin'), disconnectYouTube); // Admin only

// Live stream routes (order: list before :id)
router.post('/live/create', protect, authorize('teacher', 'admin'), createLiveStream);
router.get('/live', protect, authorize('teacher', 'admin'), getAllLives);
router.get('/live/:id', protect, authorize('teacher', 'admin'), getLiveById);
router.patch('/live/:id/archive', protect, authorize('teacher', 'admin'), archiveLive);
router.delete('/live/:id', protect, authorize('teacher', 'admin'), deleteLive);

module.exports = router;
