const express = require('express');

const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  searchLabelCatalog,
  listRecentCustomLabels,
  createCustomLabel,
  listManagedLabels,
  updateLabelAvailability,
  bulkUpdateLabelAvailability,
} = require('../controllers/starCamLabelCatalog.controller');

/**
 * Star Cam Vision Label Catalog (Admin CMS)
 *
 * Base path: /api/admin/star-cam/label-catalog
 *
 * - GET  /search         Search OID + custom labels by DisplayName
 * - GET  /recent-custom  List latest client-added custom labels
 * - POST /custom          Create a client-added custom label
 */

router.use(protect);
router.use(authorize('admin', 'teacher', 'content_creator'));

router.get('/search', searchLabelCatalog);
router.get('/recent-custom', listRecentCustomLabels);
router.get('/labels', listManagedLabels);
router.post('/custom', createCustomLabel);
router.patch('/labels/:labelId/availability', updateLabelAvailability);
router.post('/labels/bulk-availability', bulkUpdateLabelAvailability);

module.exports = router;
