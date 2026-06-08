const express = require('express');

const router = express.Router();

const { getSchoolProspects } = require('../controllers/schoolProspects.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Admin School Prospect Routes
 *
 * Base path (mounted): /api/admin/school-prospects
 *
 * Protected routes (require admin authentication):
 * - GET / - List school prospects (pagination + search)
 */
router.get('/', protect, authorize('admin'), getSchoolProspects);

module.exports = router;
