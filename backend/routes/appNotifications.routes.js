const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  registerDeviceToken,
  unregisterDeviceToken,
  reportTimezone,
  listInbox,
  getUnreadCount,
  markInboxItemRead,
  markAllInboxRead,
} = require('../controllers/appNotifications.controller');

/**
 * App notification device tokens + parent inbox.
 * Base: /api/notifications
 */
router.use(protect);
router.use(authorize('parent', 'admin'));

router.post('/device-tokens', registerDeviceToken);
router.delete('/device-tokens', unregisterDeviceToken);
router.post('/timezone', reportTimezone);
router.get('/inbox', listInbox);
router.get('/inbox/unread-count', getUnreadCount);
router.post('/inbox/read-all', markAllInboxRead);
router.post('/inbox/:id/read', markInboxItemRead);

module.exports = router;
