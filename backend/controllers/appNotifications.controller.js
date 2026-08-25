const devicePushTokenService = require('../services/devicePushToken.services');
const notificationInboxService = require('../services/notificationInbox.services');
const { reportUserTimezone } = require('../services/userTimezone.services');

const handleError = (res, error, fallback = 'Notification request failed') => {
  const message = error.message || fallback;
  const status =
    error.statusCode ||
    (/not found/i.test(message)
      ? 404
      : /not allowed|cannot open another/i.test(message)
        ? 403
        : /required|invalid|must/i.test(message)
          ? 400
          : 500);
  return res.status(status).json({
    success: false,
    message,
  });
};

const registerDeviceToken = async (req, res) => {
  try {
    const tokenRow = await devicePushTokenService.registerDevicePushToken({
      userId: req.user._id,
      platform: req.body?.platform,
      token: req.body?.token,
      timezone: req.body?.timezone,
      clientKind: req.body?.clientKind,
    });
    return res.status(200).json({
      success: true,
      message: 'Device push token registered',
      data: tokenRow,
    });
  } catch (error) {
    console.error('[app-notifications] registerDeviceToken:', error);
    return handleError(res, error, 'Failed to register device push token');
  }
};

const unregisterDeviceToken = async (req, res) => {
  try {
    await devicePushTokenService.unregisterDevicePushToken({
      userId: req.user._id,
      token: req.body?.token,
    });
    return res.status(200).json({
      success: true,
      message: 'Device push token removed',
    });
  } catch (error) {
    console.error('[app-notifications] unregisterDeviceToken:', error);
    return handleError(res, error, 'Failed to remove device push token');
  }
};

const reportTimezone = async (req, res) => {
  try {
    const timezone = await reportUserTimezone({
      userId: req.user._id,
      timezone: req.body?.timezone,
    });
    return res.status(200).json({
      success: true,
      message: timezone ? 'Timezone updated' : 'Timezone unchanged',
      data: { timezone },
    });
  } catch (error) {
    console.error('[app-notifications] reportTimezone:', error);
    return handleError(res, error, 'Failed to update timezone');
  }
};

const listInbox = async (req, res) => {
  try {
    const result = await notificationInboxService.listInbox(req.user._id, req.query);
    return res.status(200).json({
      success: true,
      message: 'Notification inbox loaded',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[app-notifications] listInbox:', error);
    return handleError(res, error, 'Failed to load notification inbox');
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const result = await notificationInboxService.getUnreadCount(req.user._id);
    return res.status(200).json({
      success: true,
      message: 'Unread notification count loaded',
      data: result,
    });
  } catch (error) {
    console.error('[app-notifications] getUnreadCount:', error);
    return handleError(res, error, 'Failed to load unread notification count');
  }
};

const markInboxItemRead = async (req, res) => {
  try {
    const item = await notificationInboxService.markInboxItemRead(req.user._id, req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: item,
    });
  } catch (error) {
    console.error('[app-notifications] markInboxItemRead:', error);
    return handleError(res, error, 'Failed to mark notification as read');
  }
};

const markAllInboxRead = async (req, res) => {
  try {
    const result = await notificationInboxService.markAllInboxRead(req.user._id);
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      data: result,
    });
  } catch (error) {
    console.error('[app-notifications] markAllInboxRead:', error);
    return handleError(res, error, 'Failed to mark notifications as read');
  }
};

module.exports = {
  registerDeviceToken,
  unregisterDeviceToken,
  reportTimezone,
  listInbox,
  getUnreadCount,
  markInboxItemRead,
  markAllInboxRead,
};
