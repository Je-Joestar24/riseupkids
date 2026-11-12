const express = require('express');
const router = express.Router();
const controller = require('../controllers/experienceAdmin.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadExperience } = require('../middleware/uploadExperience');

/**
 * Admin Experiences — the list of experiences children see under Explore.
 *
 * Base path: /api/admin/experiences   (admins only; not to be confused with /api/experience, the free
 * Smoothie page on the sales site)
 *
 * GET    /                    - list (?status=all|published|draft &search= &page= &limit=)
 * POST   /                    - create (JSON, or multipart with coverImage / printableImage)
 * POST   /reorder             - save a new order: { order: [uuid, ...] } with every experience once
 * GET    /:uuid               - one experience, as the editor needs it
 * PUT    /:uuid               - edit the fields that are sent (JSON, or multipart with pictures)
 * PATCH  /:uuid/publish       - show it to children
 * PATCH  /:uuid/unpublish     - hide it from children
 * POST   /:uuid/videos/reorder          - new order of the videos: { order: [videoId, ...] } with every video once
 * PATCH  /:uuid/videos/:videoId/position - move one video: { position: 2 } (1 = first)
 * DELETE /:uuid               - delete for good
 */

router.use(protect);
router.use(authorize('admin'));

router.get('/', controller.list);
router.post('/', uploadExperience, controller.create);

// Before /:uuid so "reorder" is never read as an id.
router.post('/reorder', controller.reorder);

router.get('/:uuid', controller.getOne);
router.put('/:uuid', uploadExperience, controller.update);
router.patch('/:uuid/publish', controller.publish);
router.patch('/:uuid/unpublish', controller.unpublish);
router.post('/:uuid/videos/reorder', controller.reorderVideos);
router.patch('/:uuid/videos/:videoId/position', controller.moveVideo);
router.delete('/:uuid', controller.remove);

module.exports = router;
