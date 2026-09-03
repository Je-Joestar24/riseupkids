const express = require('express');
const router = express.Router();
const { submitInvitation } = require('../controllers/invitationController');
const { publicFormLimiter } = require('../middleware/rateLimit');

/**
 * Invitation routes (sales page → Flodesk only, no user creation)
 *
 * Base path: /api/invitation
 *
 * POST / - Submit invitation (parentName, email, whatsapp, age) — per-IP rate limited (RUK-SEC-022)
 */
router.post('/', publicFormLimiter, submitInvitation);

module.exports = router;
