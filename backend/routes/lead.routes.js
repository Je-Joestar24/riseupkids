const express = require('express');

const router = express.Router();

const { getLeads } = require('../controllers/leads.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Admin Lead Routes
 *
 * Base path (mounted): /api/admin/leads
 *
 * Protected routes (require admin authentication):
 * - GET / - List leads (pagination + search)
 */
router.get('/', protect, authorize('admin'), getLeads);

module.exports = router;

