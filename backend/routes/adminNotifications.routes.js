const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
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
} = require('../controllers/adminNotifications.controller');

/**
 * Admin Notifications
 * Base: /api/admin/notifications
 */
router.use(protect);
router.use(authorize('admin'));

router.get('/meta', getMeta);
router.post('/images', uploadNotificationImage, uploadImage);
router.get('/', listCampaigns);
router.post('/', createCampaign);
router.get('/:id/preview', previewCampaign);
router.post('/:id/duplicate', duplicateCampaign);
router.get('/:id', getCampaign);
router.patch('/:id', updateCampaign);

module.exports = router;
