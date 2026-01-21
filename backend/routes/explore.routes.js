const express = require('express');
const router = express.Router();
const {
  createExploreContent,
  getAllExploreContent,
  getExploreContentById,
  updateExploreContent,
  deleteExploreContent,
  getExploreContentByType,
  getFeaturedExploreContent,
  reorderExploreContent,
} = require('../controllers/explore.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadExplore, uploadExploreUpdate } = require('../middleware/upload');

/**
 * Explore Content Routes
 * 
 * Base path: /api/explore
 * 
 * Video Types: replay, arts_crafts, cooking, music, movement_fitness, story_time, manners_etiquette
 * 
 * Routes:
 * - POST / - Create new explore content (admin/teacher only, with file uploads)
 * - POST /reorder - Reorder explore content (admin/teacher only)
 * - GET / - Get all explore content (with filtering and pagination)
 * - GET /featured - Get featured explore content
 * - GET /type/:type - Get explore content by type (video, lesson, etc.)
 * - GET /:id - Get single explore content by ID
 * - PUT /:id - Update explore content (admin/teacher only, with optional file uploads)
 * - DELETE /:id - Delete explore content (admin/teacher only)
 */

// All routes require authentication
router.use(protect);

// Featured content route (must be before /:id to avoid conflict)
router.get('/featured', getFeaturedExploreContent);

// Get content by type route (must be before /:id to avoid conflict)
router.get('/type/:type', getExploreContentByType);

// Create new explore content (admin/teacher only, with file uploads)
router.post('/', authorize('admin', 'teacher'), uploadExplore, createExploreContent);

// Reorder explore content (admin/teacher only) - must be before /:id to avoid conflict
router.post('/reorder', authorize('admin', 'teacher'), reorderExploreContent);

// Get all explore content
router.get('/', getAllExploreContent);

// Get single explore content by ID
router.get('/:id', getExploreContentById);

// Update explore content (admin/teacher only, with optional file uploads)
router.put('/:id', authorize('admin', 'teacher'), uploadExploreUpdate, updateExploreContent);

// Delete explore content (admin/teacher only)
router.delete('/:id', authorize('admin', 'teacher'), deleteExploreContent);

module.exports = router;

