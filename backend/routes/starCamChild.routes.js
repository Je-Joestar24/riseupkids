const express = require('express');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadStarCamDetectImage } = require('../middleware/upload');
const {
  getChildStarCamCategories,
  getChildStarCamMissionsByCategory,
  getChildMissionStartFlow,
  postChildMissionDetectObject,
  getChildMissionPracticeMaterial,
} = require('../controllers/starCamChild.controller');

/**
 * Star Cam Child Flow APIs (separate runtime endpoints)
 *
 * Base path: /api/child/star-cam
 *
 * - GET /child/:childId/categories
 * - GET /child/:childId/categories/:categoryKey/missions
 * - GET /child/:childId/missions/:missionId/start
 * - POST /child/:childId/missions/:missionId/detect-object (multipart image; query itemOrder or sortOrder)
 * - GET /child/:childId/missions/:missionId/practice-material (returns vocab item with optional pronunciationVideoUrl)
 */

router.use(protect);
router.use(authorize('parent', 'admin'));

router.get('/child/:childId/categories', getChildStarCamCategories);
router.get('/child/:childId/categories/:categoryKey/missions', getChildStarCamMissionsByCategory);
router.get('/child/:childId/missions/:missionId/start', getChildMissionStartFlow);
router.post(
  '/child/:childId/missions/:missionId/detect-object',
  uploadStarCamDetectImage,
  postChildMissionDetectObject
);
router.get('/child/:childId/missions/:missionId/practice-material', getChildMissionPracticeMaterial);

module.exports = router;

