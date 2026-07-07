const express = require('express');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadStarCamDetectImage } = require('../middleware/upload');
const {
  getChildStarCamCategories,
  getChildStarCamMissionsByCategory,
  getChildMissionStartFlow,
  getChildMissionMediaManifest,
  postChildMissionDetectObject,
  getChildMissionPracticeMaterial,
} = require('../controllers/starCamChild.controller');

function isStarCamDetectDebugEnabled() {
  return String(process.env.STARCAM_DETECT_DEBUG || '').toLowerCase() === 'true';
}

function uploadStarCamDetectImageWithDebug(req, res, next) {
  uploadStarCamDetectImage(req, res, (error) => {
    if (isStarCamDetectDebugEnabled()) {
      const payload = {
        stage: 'route:upload-middleware',
        path: req.originalUrl,
        contentType: req.headers?.['content-type'] || null,
        hasFile: Boolean(req.file),
        file: req.file
          ? {
              fieldname: req.file.fieldname,
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size,
            }
          : null,
        errorName: error?.name || null,
        errorCode: error?.code || null,
        errorMessage: error?.message || null,
      };
      console.log('[StarCamDetectDebug]', JSON.stringify(payload));
    }
    if (error) return next(error);
    return next();
  });
}

/**
 * Star Cam Child Flow APIs (separate runtime endpoints)
 *
 * Base path: /api/child/star-cam
 *
 * - GET /child/:childId/categories
 * - GET /child/:childId/categories/:categoryKey/missions
 * - GET /child/:childId/missions/:missionId/start
 * - GET /child/:childId/missions/:missionId/media-manifest
 * - POST /child/:childId/missions/:missionId/detect-object (multipart image; query itemOrder or sortOrder)
 * - GET /child/:childId/missions/:missionId/practice-material (returns vocab item with optional pronunciationVideoUrl)
 */

router.use(protect);
router.use(authorize('parent', 'admin'));

router.get('/child/:childId/categories', getChildStarCamCategories);
router.get('/child/:childId/categories/:categoryKey/missions', getChildStarCamMissionsByCategory);
router.get('/child/:childId/missions/:missionId/start', getChildMissionStartFlow);
router.get('/child/:childId/missions/:missionId/media-manifest', getChildMissionMediaManifest);
router.post(
  '/child/:childId/missions/:missionId/detect-object',
  uploadStarCamDetectImageWithDebug,
  postChildMissionDetectObject
);
router.get('/child/:childId/missions/:missionId/practice-material', getChildMissionPracticeMaterial);

module.exports = router;

