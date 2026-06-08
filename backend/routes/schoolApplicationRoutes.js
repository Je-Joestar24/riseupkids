const express = require('express');
const router = express.Router();
const { submitSchoolApplication } = require('../controllers/schoolApplicationController');

/**
 * School application routes (sales schools page → MongoDB + Flodesk)
 *
 * Base path: /api/school-application
 *
 * POST / - Submit school prospect application
 */
router.post('/', submitSchoolApplication);

module.exports = router;
