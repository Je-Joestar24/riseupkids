const express = require('express');
const router = express.Router();
const {
  verifyExperienceAccess,
  restoreExperienceAccess,
} = require('../controllers/experienceController');
const { experienceAccessLimiter } = require('../middleware/rateLimit');

/**
 * Free Smoothie Experience routes (hidden /experiencia page on the sales site)
 *
 * Base path: /api/experience
 *
 * POST /verify  - email + reCAPTCHA -> Flodesk freebie-segment check -> videos + device token
 * POST /session - signed device token -> videos (no email retyping on a returning device)
 */
router.post('/verify', experienceAccessLimiter, verifyExperienceAccess);
router.post('/session', experienceAccessLimiter, restoreExperienceAccess);

module.exports = router;
