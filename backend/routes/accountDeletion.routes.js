const express = require('express');
const router = express.Router();
const {
  listDeletionRequests,
  executeDeletionRequest,
  executeAllPendingDeletionRequests,
} = require('../controllers/accountDeletion.controller');
const { protect, authorize } = require('../middleware/auth');
const { requireStepUp } = require('../middleware/stepUp');

/**
 * Admin Account Deletion Routes
 * Base path: /api/admin/deletion-requests
 *
 * Chunk 10: executing a deletion is exactly the "deletion override" example the step-up-auth
 * requirement names — a valid session alone isn't enough, a fresh 2FA code is required too, via
 * requireStepUp() (POST /api/auth/step-up-verify first, then the returned token as
 * X-Step-Up-Token on these two requests).
 */
router.use(protect, authorize('admin'));

router.get('/', listDeletionRequests);
router.post('/execute-pending', requireStepUp, executeAllPendingDeletionRequests);
router.post('/:id/execute', requireStepUp, executeDeletionRequest);

module.exports = router;
