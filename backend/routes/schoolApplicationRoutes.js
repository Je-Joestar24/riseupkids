const express = require('express');
const router = express.Router();
const { submitSchoolApplication } = require('../controllers/schoolApplicationController');
const { publicFormLimiter } = require('../middleware/rateLimit');

/**
 * School application routes (sales schools page → MongoDB + Flodesk)
 *
 * Base path: /api/school-application
 *
 * POST / - Submit school prospect application — per-IP rate limited (RUK-SEC-022)
 */
router.post('/', publicFormLimiter, submitSchoolApplication);

module.exports = router;
