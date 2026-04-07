const starCamMissionsAdminService = require('../services/starCamMissionsAdmin.service');

const listMissions = async (req, res) => {
  try {
    const { page, limit, status, search, categoryId } = req.query || {};
    const data = await starCamMissionsAdminService.listMissions({ page, limit, status, search, categoryId });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to list missions' });
  }
};

const createMission = async (req, res) => {
  try {
    const { missionId, title, categoryId } = req.body || {};
    const data = await starCamMissionsAdminService.createMission({ userId: req.user?._id, missionId, title, categoryId });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || (String(error.message || '').toLowerCase().includes('required') ? 400 : 500);
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to create mission' });
  }
};

const listCategories = async (req, res) => {
  try {
    const includeInactive = String(req.query?.includeInactive || '').toLowerCase() === 'true';
    const data = await starCamMissionsAdminService.listCategories({ includeInactive });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to list categories' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { key, name, description, sortOrder, isActive } = req.body || {};
    const data = await starCamMissionsAdminService.createCategory({ key, name, description, sortOrder, isActive });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || (String(error.message || '').toLowerCase().includes('required') ? 400 : 500);
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to create category' });
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

const addMissionVocabulary = async (req, res) => {
  try {
    const { id } = req.params;
    const displayText = req.body?.displayText;
    const target = req.body?.target;
    const imageFile = req.files?.image?.[0] || null;
    const audioFile = req.files?.audio?.[0] || null;
    const data = await starCamMissionsAdminService.addMissionVocabularyEntry({
      id,
      userId: req.user?._id,
      displayText,
      target,
      imageFile,
      audioFile,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to add vocabulary' });
  }
};

const uploadMissionImage = async (req, res) => {
  try {
    const { id } = req.params;
    const imageFile = req.files?.image?.[0] || null;
    const data = await starCamMissionsAdminService.uploadMissionImage({
      id,
      userId: req.user?._id,
      imageFile,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to upload mission image' });
  }
};

module.exports = {
  listMissions,
  listCategories,
  createCategory,
  createMission,
  getMission,
  updateMission,
  publishMission,
  unpublishMission,
  archiveMission,
  addMissionVocabulary,
  uploadMissionImage,
};

