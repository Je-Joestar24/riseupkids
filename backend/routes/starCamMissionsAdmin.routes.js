const express = require('express');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  listMissions,
  createMission,
  getMission,
  updateMission,
  publishMission,
  unpublishMission,
  archiveMission,
} = require('../controllers/starCamMissionsAdmin.controller');

/**
 * Star Cam Missions (Admin CMS)
 *
 * Base path: /api/admin/star-cam/missions
 *
 * Admin routes:
 * - GET    /           List missions
 * - POST   /           Create mission (draft)
 * - GET    /:id        Get mission by id
 * - PATCH  /:id        Update mission (draft/published)
 * - POST   /:id/publish    Publish mission (validates strict requirements)
 * - POST   /:id/unpublish  Unpublish to draft
 * - POST   /:id/archive    Archive mission (read-only)
 */

router.use(protect);
router.use(authorize('admin', 'teacher'));

router.get('/', listMissions);
router.post('/', createMission);
router.get('/:id', getMission);
router.patch('/:id', updateMission);
router.post('/:id/publish', publishMission);
router.post('/:id/unpublish', unpublishMission);
router.post('/:id/archive', archiveMission);

module.exports = router;

