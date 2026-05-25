const starCamChildService = require('../services/starCamChild.service');
const starCamDetectionService = require('../services/starCamDetection.service');

function isStarCamDetectDebugEnabled() {
  return String(process.env.STARCAM_DETECT_DEBUG || '').toLowerCase() === 'true';
}

function shouldExposeDetectErrorDetails() {
  return isStarCamDetectDebugEnabled() || process.env.NODE_ENV !== 'production';
}

function logStarCamDetectRequest(req, stage, extra = {}) {
  if (!isStarCamDetectDebugEnabled()) return;
  const debugPayload = {
    stage,
    method: req.method,
    path: req.originalUrl,
    query: req.query,
    contentType: req.headers?.['content-type'] || null,
    contentLength: req.headers?.['content-length'] || null,
    bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : [],
    hasFile: Boolean(req.file),
    file: req.file
      ? {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      : null,
    filesType: Array.isArray(req.files) ? 'array' : req.files ? 'object' : null,
    ...extra,
  };
  // Keep logs structured for easy copy/paste while debugging endpoint payload issues.
  console.log('[StarCamDetectDebug]', JSON.stringify(debugPayload));
}

function buildVisionDebugDetails(error) {
  const cause = error?.cause || null;
  return {
    errorName: error?.name || null,
    errorMessage: error?.message || null,
    errorCode: error?.code || null,
    errorStatusCode: error?.statusCode || null,
    causeName: cause?.name || null,
    causeMessage: cause?.message || null,
    causeCode: cause?.code ?? null,
    causeDetails: cause?.details || null,
    causeStatus: cause?.status || null,
  };
}

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
    logStarCamDetectRequest(req, 'controller:received');
    const { childId, missionId } = req.params;
    const { itemOrder, sortOrder } = req.query;
    const imageBuffer = req.file?.buffer;
    if (!imageBuffer) {
      logStarCamDetectRequest(req, 'controller:missing-image');
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
    logStarCamDetectRequest(req, 'controller:detected-success', {
      detectionStatus: data?.status || null,
      detectionTarget: data?.target || null,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    logStarCamDetectRequest(req, 'controller:error', {
      errorName: error?.name || null,
      errorMessage: error?.message || null,
    });
    const statusCode = error.statusCode || 500;
    const response = {
      success: false,
      message: error.message || 'Object detection failed',
      code: error.code || 'STARCAM_DETECT_FAILED',
    };
    if (shouldExposeDetectErrorDetails()) {
      response.details = buildVisionDebugDetails(error);
    }
    return res.status(statusCode).json(response);
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

