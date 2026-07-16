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
  updateMissionVocabulary,
  updateMissionVocabularyInclusion,
  deleteMissionVocabulary,
  uploadMissionImage,
  uploadMissionMedia,
  updateMissionItem,
  deleteMissionItem,
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
 * - POST   /:id/vocab      Add vocabulary (image, main audio, tryAgain + success audio; optional introAudio, optional pronunciationVideo)
 * - POST   /:id/mission-image Upload/replace mission cover image (optional)
 * - POST   /:id/mission-media Upload/replace short video, mission intro audio, reward audio, or reward video
 */

router.use(protect);
router.use(authorize('admin', 'teacher', 'content_creator'));

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
router.patch('/:id/vocab/:sortOrder/inclusion', updateMissionVocabularyInclusion);
router.patch('/:id/vocab/:sortOrder', uploadStarCamVocab, updateMissionVocabulary);
router.delete('/:id/vocab/:sortOrder', deleteMissionVocabulary);
router.patch('/:id/items/:sortOrder', updateMissionItem);
router.delete('/:id/items/:sortOrder', deleteMissionItem);
router.post('/:id/mission-image', uploadStarCamMissionImage, uploadMissionImage);
router.post('/:id/mission-media', uploadStarCamMissionMedia, uploadMissionMedia);

module.exports = router;

