const notificationCampaignService = require('../services/notificationCampaign.services');

const handleError = (res, error, fallback = 'Notification request failed') => {
  const message = error.message || fallback;
  const status = error.statusCode || (/not found/i.test(message) ? 404 : /required|invalid|must|duplicate/i.test(message) ? 400 : 500);
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

module.exports = {
  getMeta,
  listCampaigns,
  createCampaign,
  getCampaign,
  updateCampaign,
  duplicateCampaign,
  previewCampaign,
  uploadImage,
};
