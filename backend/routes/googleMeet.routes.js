const express = require('express');
const router = express.Router();
const {
  getAuthUrl,
  handleOAuthCallback,
  getConnectionStatus,
  disconnectGoogle,
  createMeeting,
  updateMeeting,
  cancelMeeting,
  getMeeting,
} = require('../controllers/googleMeet.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Google Meet Routes
 * 
 * Base path: /api/google
 * 
 * OAuth routes:
 * - GET /oauth/url - Get OAuth URL (Teacher/Admin only)
 * - GET /oauth/callback - OAuth callback (Public, called by Google)
 * - GET /status - Check connection status (Teacher/Admin only)
 * - POST /disconnect - Disconnect Google account (Teacher/Admin only)
 * 
 * Meeting management routes:
 * - POST /meetings - Create meeting (Teacher/Admin only)
 * - PATCH /meetings/:eventId - Update meeting (Teacher/Admin only)
 * - DELETE /meetings/:eventId - Cancel meeting (Teacher/Admin only)
 * - GET /meetings/:eventId - Get meeting details (Teacher/Admin/Parent)
 */

// OAuth routes
router.get('/oauth/url', protect, authorize('teacher', 'admin'), getAuthUrl);
router.get('/oauth/callback', handleOAuthCallback); // Public - called by Google
router.get('/status', protect, authorize('teacher', 'admin'), getConnectionStatus);
router.post('/disconnect', protect, authorize('teacher', 'admin'), disconnectGoogle);

// Meeting management routes
router.post('/meetings', protect, authorize('teacher', 'admin'), createMeeting);
router.patch('/meetings/:eventId', protect, authorize('teacher', 'admin'), updateMeeting);
router.delete('/meetings/:eventId', protect, authorize('teacher', 'admin'), cancelMeeting);
// Note: Parents can join meetings via link (no API needed)
// If we add Meeting model later, we can create a separate endpoint for parents
router.get('/meetings/:eventId', protect, authorize('teacher', 'admin'), getMeeting);

module.exports = router;
