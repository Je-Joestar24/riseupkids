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
 * - POST / - Create new explore content (admin only, with file uploads)
 * - GET / - Get all explore content (with filtering and pagination)
 * - GET /featured - Get featured explore content
 * - GET /type/:type - Get explore content by type (video, lesson, etc.)
 * - GET /:id - Get single explore content by ID
 * - PUT /:id - Update explore content (admin only, with optional file uploads)
 * - DELETE /:id - Delete explore content (admin only)
 */

// All routes require authentication
router.use(protect);

// Featured content route (must be before /:id to avoid conflict)
router.get('/featured', getFeaturedExploreContent);

// Get content by type route (must be before /:id to avoid conflict)
router.get('/type/:type', getExploreContentByType);

// Create new explore content (admin only, with file uploads)
router.post('/', authorize('admin'), uploadExplore, createExploreContent);

// Get all explore content
router.get('/', getAllExploreContent);

// Get single explore content by ID
router.get('/:id', getExploreContentById);

// Update explore content (admin only, with optional file uploads)
router.put('/:id', authorize('admin'), uploadExploreUpdate, updateExploreContent);

// Delete explore content (admin only)
router.delete('/:id', authorize('admin'), deleteExploreContent);

module.exports = router;

