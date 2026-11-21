const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requireAccessArea } = require('../middleware/accessArea');
const { uploadNotificationImage } = require('../middleware/upload');
const {
  getMeta,
  listCampaigns,
  createCampaign,
  getCampaign,
  updateCampaign,
  duplicateCampaign,
  previewCampaign,
  uploadImage,
  deleteImage,
  getAnalytics,
  getDashboard,
  scheduleCampaign,
  cancelCampaign,
  sendNow,
  sendTest,
} = require('../controllers/adminNotifications.controller');

/**
 * Admin Notifications
 * Base: /api/admin/notifications
 */
router.use(protect);
router.use(authorize('admin', 'content_creator'));
// A content creator needs the Notifications area; an admin is never limited
router.use(requireAccessArea('notifications'));

router.get('/meta', getMeta);
router.get('/dashboard', getDashboard);
router.post('/images', uploadNotificationImage, uploadImage);
router.delete('/images/:mediaId', deleteImage);
router.get('/', listCampaigns);
router.post('/', createCampaign);
router.get('/:id/preview', previewCampaign);
router.get('/:id/analytics', getAnalytics);
router.post('/:id/duplicate', duplicateCampaign);
router.post('/:id/schedule', scheduleCampaign);
router.post('/:id/cancel', cancelCampaign);
router.post('/:id/send-now', sendNow);
router.post('/:id/test', sendTest);
router.get('/:id', getCampaign);
router.patch('/:id', updateCampaign);

module.exports = router;
