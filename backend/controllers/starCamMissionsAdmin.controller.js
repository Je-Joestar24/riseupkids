const starCamMissionsAdminService = require('../services/starCamMissionsAdmin.service');

const listMissions = async (req, res) => {
  try {
    const { page, limit, status, search } = req.query || {};
    const data = await starCamMissionsAdminService.listMissions({ page, limit, status, search });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to list missions' });
  }
};

const createMission = async (req, res) => {
  try {
    const { missionId, title } = req.body || {};
    const data = await starCamMissionsAdminService.createMission({ userId: req.user?._id, missionId, title });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || (String(error.message || '').toLowerCase().includes('required') ? 400 : 500);
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to create mission' });
  }
};

const getMission = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await starCamMissionsAdminService.getMissionById({ id });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || (String(error.message || '').toLowerCase().includes('not found') ? 404 : 500);
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to get mission' });
  }
};

const updateMission = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await starCamMissionsAdminService.updateMission({ id, userId: req.user?._id, patch: req.body });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to update mission' });
  }
};

const publishMission = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await starCamMissionsAdminService.publishMission({ id, userId: req.user?._id });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to publish mission' });
  }
};

const unpublishMission = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await starCamMissionsAdminService.unpublishMission({ id, userId: req.user?._id });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to unpublish mission' });
  }
};

const archiveMission = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await starCamMissionsAdminService.archiveMission({ id, userId: req.user?._id });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to archive mission' });
  }
};

module.exports = {
  listMissions,
  createMission,
  getMission,
  updateMission,
  publishMission,
  unpublishMission,
  archiveMission,
};

