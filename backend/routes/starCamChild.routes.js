const express = require('express');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getChildStarCamCategories,
  getChildStarCamMissionsByCategory,
  getChildMissionStartFlow,
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
 * - GET /child/:childId/missions/:missionId/practice-material (returns vocab item with optional pronunciationVideoUrl)
 */

router.use(protect);
router.use(authorize('parent', 'admin'));

router.get('/child/:childId/categories', getChildStarCamCategories);
router.get('/child/:childId/categories/:categoryKey/missions', getChildStarCamMissionsByCategory);
router.get('/child/:childId/missions/:missionId/start', getChildMissionStartFlow);
router.get('/child/:childId/missions/:missionId/practice-material', getChildMissionPracticeMaterial);

module.exports = router;

