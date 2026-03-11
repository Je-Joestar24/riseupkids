const express = require('express');
const router = express.Router();
const { submitInvitation } = require('../controllers/invitationController');

/**
 * Invitation routes (sales page → Flodesk only, no user creation)
 *
 * Base path: /api/invitation
 *
 * POST / - Submit invitation (parentName, email, whatsapp, age)
 */
router.post('/', submitInvitation);

module.exports = router;
