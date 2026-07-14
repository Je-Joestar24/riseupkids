const express = require('express');
const router = express.Router();
const {
  listDeletionRequests,
  executeDeletionRequest,
  executeAllPendingDeletionRequests,
} = require('../controllers/accountDeletion.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Admin Account Deletion Routes
 * Base path: /api/admin/deletion-requests
 */
router.use(protect, authorize('admin'));

router.get('/', listDeletionRequests);
router.post('/execute-pending', executeAllPendingDeletionRequests);
router.post('/:id/execute', executeDeletionRequest);

module.exports = router;
