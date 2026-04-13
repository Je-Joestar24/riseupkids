const starCamChildService = require('../services/starCamChild.service');
const starCamDetectionService = require('../services/starCamDetection.service');

async function getChildStarCamCategories(req, res) {
  try {
    const { childId } = req.params;
    const data = await starCamChildService.getAvailableCategoriesForChild({
      parentUserId: req.user?._id,
      childId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to load Star Cam categories',
    });
  }
}

async function getChildStarCamMissionsByCategory(req, res) {
  try {
    const { childId, categoryKey } = req.params;
    const data = await starCamChildService.getLatestMissionsByCategoryForChild({
      parentUserId: req.user?._id,
      childId,
      categoryKey,
      limit: 3,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to load missions',
    });
  }
}

async function getChildMissionStartFlow(req, res) {
  try {
    const { childId, missionId } = req.params;
    const data = await starCamChildService.getMissionStartFlowForChild({
      parentUserId: req.user?._id,
      childId,
      missionId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to load mission flow',
    });
  }
}

async function postChildMissionDetectObject(req, res) {
  try {
    const { childId, missionId } = req.params;
    const { itemOrder, sortOrder } = req.query;
    const imageBuffer = req.file?.buffer;
    if (!imageBuffer) {
      return res.status(400).json({
        success: false,
        message: 'image file is required (multipart field: image)',
      });
    }
    const data = await starCamDetectionService.detectMissionObjectForChild({
      parentUserId: req.user?._id,
      childId,
      missionId,
      itemOrder,
      sortOrder,
      imageBuffer,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Object detection failed',
    });
  }
}

async function getChildMissionPracticeMaterial(req, res) {
  try {
    const { childId, missionId } = req.params;
    const { index } = req.query;
    const data = await starCamChildService.getMissionPracticeMaterialForChild({
      parentUserId: req.user?._id,
      childId,
      missionId,
      index,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to load mission practice material',
    });
  }
}

module.exports = {
  getChildStarCamCategories,
  getChildStarCamMissionsByCategory,
  getChildMissionStartFlow,
  postChildMissionDetectObject,
  getChildMissionPracticeMaterial,
};

