const express = require('express');
const router = express.Router();
const {
  createVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
} = require('../controllers/video.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadVideo, uploadVideoUpdate } = require('../middleware/upload');

/**
 * Video Routes
 * 
 * Base path: /api/videos
 * 
 * All routes require authentication and admin/teacher role
 * 
 * Routes:
 * - POST / - Create new video (with video file, SCORM file, and cover image upload)
 * - GET / - Get all videos (with filtering and pagination)
 * - GET /:id - Get single video by ID
 * - PUT /:id - Update video (title, description, coverImage, duration, starsAwarded)
 * - DELETE /:id - Delete video (hard delete)
 */

// All routes require authentication
router.use(protect);

// All routes require admin/teacher role
router.use(authorize('admin', 'teacher'));

// Create new video (with video file, SCORM file, and cover image upload)
router.post('/', uploadVideo, createVideo);

// Get all videos
router.get('/', getAllVideos);

// Get single video by ID
router.get('/:id', getVideoById);

// Update video (with optional cover image upload, no video/SCORM files)
router.put('/:id', uploadVideoUpdate, updateVideo);

// Delete video
router.delete('/:id', deleteVideo);

module.exports = router;

