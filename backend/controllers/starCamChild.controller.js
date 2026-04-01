const starCamChildService = require('../services/starCamChild.service');

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

module.exports = {
  getChildStarCamCategories,
  getChildStarCamMissionsByCategory,
  getChildMissionStartFlow,
};

