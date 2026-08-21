const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  registerDeviceToken,
  unregisterDeviceToken,
} = require('../controllers/appNotifications.controller');

/**
 * App notification device tokens (parent devices).
 * Base: /api/notifications
 */
router.use(protect);
router.use(authorize('parent', 'admin'));

router.post('/device-tokens', registerDeviceToken);
router.delete('/device-tokens', unregisterDeviceToken);

module.exports = router;
