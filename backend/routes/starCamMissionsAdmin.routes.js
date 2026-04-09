const express = require('express');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadStarCamVocab, uploadStarCamMissionImage, uploadStarCamMissionMedia } = require('../middleware/upload');
const {
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
  uploadMissionMedia,
} = require('../controllers/starCamMissionsAdmin.controller');

/**
 * Star Cam Missions (Admin CMS)
 *
 * Base path: /api/admin/star-cam/missions
 *
 * Admin routes:
 * - GET    /           List missions
 * - POST   /           Create mission (draft)
 * - GET    /categories List categories
 * - POST   /categories Create category
 * - GET    /:id        Get mission by id
 * - PATCH  /:id        Update mission (draft/published)
 * - POST   /:id/publish    Publish mission (validates strict requirements)
 * - POST   /:id/unpublish  Unpublish to draft
 * - POST   /:id/archive    Archive mission (read-only)
 * - POST   /:id/vocab      Add one vocabulary entry (displayText, target, image file, audio file)
 * - POST   /:id/mission-image Upload/replace mission cover image (optional)
 */

router.use(protect);
router.use(authorize('admin', 'teacher'));

router.get('/categories', listCategories);
router.post('/categories', createCategory);

router.get('/', listMissions);
router.post('/', createMission);
router.get('/:id', getMission);
router.patch('/:id', updateMission);
router.post('/:id/publish', publishMission);
router.post('/:id/unpublish', unpublishMission);
router.post('/:id/archive', archiveMission);
router.post('/:id/vocab', uploadStarCamVocab, addMissionVocabulary);
router.post('/:id/mission-image', uploadStarCamMissionImage, uploadMissionImage);
router.post('/:id/mission-media', uploadStarCamMissionMedia, uploadMissionMedia);

module.exports = router;

