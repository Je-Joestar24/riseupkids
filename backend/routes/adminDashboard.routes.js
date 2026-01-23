const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/adminDashboard.controller');
const { protect, authorize } = require('../middleware/auth');

/**
 * Admin Dashboard Routes
 *
 * Base path: /api/admin/dashboard
 *
 * Protected routes (require admin authentication):
 * - GET / - Get dashboard statistics
 */
router.get('/', protect, authorize('admin'), getDashboardStats);

module.exports = router;
