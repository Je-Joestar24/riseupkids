const starCamMissionsAdminService = require('../services/starCamMissionsAdmin.service');

function resolveStatusCode(error, fallback = 500) {
  if (error && Number.isInteger(error.statusCode)) return error.statusCode;
  return fallback;
}

const listMissions = async (req, res) => {
  try {
    const { page, limit, status, search, categoryId } = req.query || {};
    const data = await starCamMissionsAdminService.listMissions({
      user: req.user,
      page,
      limit,
      status,
      search,
      categoryId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to list missions' });
  }
};

const createMission = async (req, res) => {
  try {
    const { missionId, title, categoryId } = req.body || {};
    const data = await starCamMissionsAdminService.createMission({ userId: req.user?._id, missionId, title, categoryId });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const statusCode = resolveStatusCode(error, String(error.message || '').toLowerCase().includes('required') ? 400 : 500);
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to create mission' });
  }
};

const listCategories = async (req, res) => {
  try {
    const includeInactive = String(req.query?.includeInactive || '').toLowerCase() === 'true';
    const data = await starCamMissionsAdminService.listCategories({ includeInactive });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to list categories' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { key, name, description, sortOrder, isActive } = req.body || {};
    const data = await starCamMissionsAdminService.createCategory({ key, name, description, sortOrder, isActive });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    const statusCode = resolveStatusCode(error, String(error.message || '').toLowerCase().includes('required') ? 400 : 500);
    return res.status(statusCode).json({ success: false, message: error.message || 'Failed to create category' });
  }
};

const getMission = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await starCamMissionsAdminService.getMissionById({ id, user: req.user });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error, String(error.message || '').toLowerCase().includes('not found') ? 404 : 500)).json({
      success: false,
      message: error.message || 'Failed to get mission',
    });
  }
};

const updateMission = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await starCamMissionsAdminService.updateMission({
      id,
      user: req.user,
      userId: req.user?._id,
      patch: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to update mission' });
  }
};

const publishMission = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await starCamMissionsAdminService.publishMission({ id, user: req.user, userId: req.user?._id });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to publish mission' });
  }
};

const unpublishMission = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await starCamMissionsAdminService.unpublishMission({ id, user: req.user, userId: req.user?._id });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to unpublish mission' });
  }
};

const archiveMission = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await starCamMissionsAdminService.archiveMission({ id, user: req.user, userId: req.user?._id });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to archive mission' });
  }
};

const addMissionVocabulary = async (req, res) => {
  try {
    const { id } = req.params;
    const displayText = req.body?.displayText;
    const target = req.body?.target;
    const labelId = req.body?.labelId;
    const labelSource = req.body?.labelSource;
    const keywordBucket = req.body?.keywordBucket;
    const imageFile = req.files?.image?.[0] || null;
    const audioFile = req.files?.audio?.[0] || null;
    const introAudioFile = req.files?.introAudio?.[0] || null;
    const tryAgainAudioFile = req.files?.tryAgainAudio?.[0] || null;
    const successAudioFile = req.files?.successAudio?.[0] || null;
    const pronunciationVideoFile = req.files?.pronunciationVideo?.[0] || null;
    const data = await starCamMissionsAdminService.addMissionVocabularyEntry({
      id,
      user: req.user,
      userId: req.user?._id,
      displayText,
      target,
      labelId,
      labelSource,
      keywordBucket,
      imageFile,
      audioFile,
      introAudioFile,
      tryAgainAudioFile,
      successAudioFile,
      pronunciationVideoFile,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to add vocabulary' });
  }
};

const updateMissionVocabulary = async (req, res) => {
  try {
    const { id, sortOrder } = req.params;
    const displayText = req.body?.displayText;
    const target = req.body?.target;
    const labelId = req.body?.labelId;
    const labelSource = req.body?.labelSource;
    const keywordBucket = req.body?.keywordBucket;
    const imageFile = req.files?.image?.[0] || null;
    const audioFile = req.files?.audio?.[0] || null;
    const introAudioFile = req.files?.introAudio?.[0] || null;
    const tryAgainAudioFile = req.files?.tryAgainAudio?.[0] || null;
    const successAudioFile = req.files?.successAudio?.[0] || null;
    const pronunciationVideoFile = req.files?.pronunciationVideo?.[0] || null;
    const data = await starCamMissionsAdminService.updateMissionVocabularyEntry({
      id,
      user: req.user,
      userId: req.user?._id,
      sortOrder,
      displayText,
      target,
      labelId,
      labelSource,
      keywordBucket,
      imageFile,
      audioFile,
      introAudioFile,
      tryAgainAudioFile,
      successAudioFile,
      pronunciationVideoFile,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to update vocabulary' });
  }
};

const deleteMissionVocabulary = async (req, res) => {
  try {
    const { id, sortOrder } = req.params;
    const data = await starCamMissionsAdminService.deleteMissionVocabularyEntry({
      id,
      user: req.user,
      userId: req.user?._id,
      sortOrder,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to delete vocabulary' });
  }
};

const uploadMissionImage = async (req, res) => {
  try {
    const { id } = req.params;
    const imageFile = req.files?.image?.[0] || null;
    const data = await starCamMissionsAdminService.uploadMissionImage({
      id,
      user: req.user,
      userId: req.user?._id,
      imageFile,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to upload mission image' });
  }
};

const uploadMissionMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const shortVideoFile = req.files?.shortVideo?.[0] || null;
    const missionIntroAudioFile = req.files?.missionIntroAudio?.[0] || null;
    const rewardAudioFile = req.files?.rewardAudio?.[0] || null;
    const rewardVideoFile = req.files?.rewardVideo?.[0] || null;
    const data = await starCamMissionsAdminService.uploadMissionMedia({
      id,
      user: req.user,
      userId: req.user?._id,
      shortVideoFile,
      missionIntroAudioFile,
      rewardAudioFile,
      rewardVideoFile,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to upload mission media' });
  }
};

const updateMissionItem = async (req, res) => {
  try {
    const { id, sortOrder } = req.params;
    const data = await starCamMissionsAdminService.updateMissionItem({
      id,
      user: req.user,
      userId: req.user?._id,
      sortOrder,
      patch: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to update mission item' });
  }
};

const deleteMissionItem = async (req, res) => {
  try {
    const { id, sortOrder } = req.params;
    const data = await starCamMissionsAdminService.deleteMissionItem({
      id,
      user: req.user,
      userId: req.user?._id,
      sortOrder,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(resolveStatusCode(error)).json({ success: false, message: error.message || 'Failed to delete mission item' });
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
  updateMissionVocabulary,
  deleteMissionVocabulary,
  uploadMissionImage,
  uploadMissionMedia,
  updateMissionItem,
  deleteMissionItem,
};
