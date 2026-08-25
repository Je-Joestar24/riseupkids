const notificationCampaignService = require('../services/notificationCampaign.services');
const { sendCampaignNow, sendCampaignTest } = require('../services/notificationSend.services');

const handleError = (res, error, fallback = 'Notification request failed') => {
  const message = error.message || fallback;
  const status = error.statusCode || (/not found/i.test(message) ? 404 : /required|invalid|must|duplicate|cannot|only /i.test(message) ? 400 : 500);
  return res.status(status).json({
    success: false,
    message,
  });
};

const getMeta = async (_req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Notification admin meta loaded',
      data: notificationCampaignService.getAdminMeta(),
    });
  } catch (error) {
    console.error('[admin-notifications] getMeta:', error);
    return handleError(res, error, 'Failed to load notification meta');
  }
};

const listCampaigns = async (req, res) => {
  try {
    const result = await notificationCampaignService.listCampaigns(req.query);
    return res.status(200).json({
      success: true,
      message: 'Notification campaigns loaded',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('[admin-notifications] listCampaigns:', error);
    return handleError(res, error, 'Failed to list notification campaigns');
  }
};

const createCampaign = async (req, res) => {
  try {
    const campaign = await notificationCampaignService.createCampaign(req.body, req.user?._id);
    return res.status(201).json({
      success: true,
      message: 'Notification campaign created',
      data: campaign,
    });
  } catch (error) {
    console.error('[admin-notifications] createCampaign:', error);
    return handleError(res, error, 'Failed to create notification campaign');
  }
};

const getCampaign = async (req, res) => {
  try {
    const campaign = await notificationCampaignService.getCampaignById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Notification campaign loaded',
      data: campaign,
    });
  } catch (error) {
    console.error('[admin-notifications] getCampaign:', error);
    return handleError(res, error, 'Failed to load notification campaign');
  }
};

const updateCampaign = async (req, res) => {
  try {
    const campaign = await notificationCampaignService.updateCampaign(
      req.params.id,
      req.body,
      req.user?._id
    );
    return res.status(200).json({
      success: true,
      message: 'Notification campaign updated',
      data: campaign,
    });
  } catch (error) {
    console.error('[admin-notifications] updateCampaign:', error);
    return handleError(res, error, 'Failed to update notification campaign');
  }
};

const duplicateCampaign = async (req, res) => {
  try {
    const campaign = await notificationCampaignService.duplicateCampaign(req.params.id, req.user?._id);
    return res.status(201).json({
      success: true,
      message: 'Notification campaign duplicated',
      data: campaign,
    });
  } catch (error) {
    console.error('[admin-notifications] duplicateCampaign:', error);
    return handleError(res, error, 'Failed to duplicate notification campaign');
  }
};

const previewCampaign = async (req, res) => {
  try {
    const preview = await notificationCampaignService.previewCampaign(
      req.params.id,
      req.query.language || req.query.lang
    );
    return res.status(200).json({
      success: true,
      message: 'Notification preview loaded',
      data: preview,
    });
  } catch (error) {
    console.error('[admin-notifications] previewCampaign:', error);
    return handleError(res, error, 'Failed to preview notification campaign');
  }
};

const uploadImage = async (req, res) => {
  try {
    const file = req.file || req.files?.image?.[0];
    const media = await notificationCampaignService.uploadNotificationImage(file, req.user?._id);
    return res.status(201).json({
      success: true,
      message: 'Notification image uploaded',
      data: media,
    });
  } catch (error) {
    console.error('[admin-notifications] uploadImage:', error);
    return handleError(res, error, 'Failed to upload notification image');
  }
};

const scheduleCampaign = async (req, res) => {
  try {
    const campaign = await notificationCampaignService.scheduleCampaign(
      req.params.id,
      req.body,
      req.user?._id
    );
    return res.status(200).json({
      success: true,
      message: 'Notification campaign scheduled',
      data: campaign,
    });
  } catch (error) {
    console.error('[admin-notifications] scheduleCampaign:', error);
    return handleError(res, error, 'Failed to schedule notification campaign');
  }
};

const cancelCampaign = async (req, res) => {
  try {
    const campaign = await notificationCampaignService.cancelCampaign(req.params.id, req.user?._id);
    return res.status(200).json({
      success: true,
      message: 'Notification campaign cancelled',
      data: campaign,
    });
  } catch (error) {
    console.error('[admin-notifications] cancelCampaign:', error);
    return handleError(res, error, 'Failed to cancel notification campaign');
  }
};

const sendNow = async (req, res) => {
  try {
    const campaign = await sendCampaignNow(req.params.id, req.user?._id);
    return res.status(200).json({
      success: true,
      message: campaign.status === 'failed' ? 'Notification send completed with failures' : 'Notification campaign sent',
      data: campaign,
    });
  } catch (error) {
    console.error('[admin-notifications] sendNow:', error);
    return handleError(res, error, 'Failed to send notification campaign');
  }
};

const sendTest = async (req, res) => {
  try {
    const result = await sendCampaignTest(req.params.id, req.user?._id, req.body?.userId);
    const delivered = (result.receipts || []).some((row) => row.pushResult === 'sent');
    const queued = (result.receipts || []).some((row) => row.pushResult === 'queued');
    let message = 'Test notification sent';
    if (!delivered && queued) {
      message = 'Test is waiting for quiet hours (7:00 AM local)';
    } else if (!delivered) {
      message = result.receipts?.[0]?.failureReason
        ? `Test did not reach a phone (${result.receipts[0].failureReason})`
        : 'Test did not reach a phone';
    }
    return res.status(200).json({
      success: delivered,
      message,
      data: result,
    });
  } catch (error) {
    console.error('[admin-notifications] sendTest:', error);
    return handleError(res, error, 'Failed to send test notification');
  }
};

module.exports = {
  getMeta,
  listCampaigns,
  createCampaign,
  getCampaign,
  updateCampaign,
  duplicateCampaign,
  previewCampaign,
  uploadImage,
  scheduleCampaign,
  cancelCampaign,
  sendNow,
  sendTest,
};
