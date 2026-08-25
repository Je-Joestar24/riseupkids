const devicePushTokenService = require('../services/devicePushToken.services');
const { reportUserTimezone } = require('../services/userTimezone.services');

const handleError = (res, error, fallback = 'Notification request failed') => {
  const message = error.message || fallback;
  const status = error.statusCode || (/required|invalid|must/i.test(message) ? 400 : 500);
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

module.exports = {
  registerDeviceToken,
  unregisterDeviceToken,
  reportTimezone,
};
