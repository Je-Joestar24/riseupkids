const express = require('express');
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  archiveCourse,
  unarchiveCourse,
  deleteCourse,
  getDefaultCourses,
  toggleDefaultStatus,
  reorderCourses,
  reorderCourseContents,
} = require('../controllers/contentCollection.controller');
const { protect, authorize } = require('../middleware/auth');
const { uploadCourse } = require('../middleware/upload');

/**
 * Course/Content Collection Routes
 * 
 * Base path: /api/courses
 * 
 * All routes require authentication and admin role
 * 
 * Routes:
 * - POST / - Create new course (with cover image upload and contents)
 * - GET / - Get all courses (with filtering and pagination)
 * - GET /default - Get all default courses
 * - PATCH /reorder - Reorder courses
 * - GET /:id - Get single course by ID (with populated contents)
 * - PUT /:id - Update course (title, description, coverImage, isPublished, tags, contents reorder)
 * - PATCH /:id/contents/reorder - Reorder contents within a course (by type)
 * - PATCH /:id/archive - Archive course (soft delete)
 * - PATCH /:id/unarchive - Unarchive course (restore)
 * - PATCH /:id/default - Toggle default status
 * - DELETE /:id - Delete course (permanent hard delete)
 */

// All routes require authentication
router.use(protect);

// All routes require admin role
router.use(authorize('admin'));

// Create new course (with cover image upload)
router.post('/', uploadCourse, createCourse);

// Get all courses
router.get('/', getAllCourses);

// Get all default courses
router.get('/default', getDefaultCourses);

// Reorder courses
router.patch('/reorder', reorderCourses);

// Get single course by ID
router.get('/:id', getCourseById);

// Reorder course contents (must be before /:id/archive to avoid route conflicts)
router.patch('/:id/contents/reorder', reorderCourseContents);

// Update course (with optional cover image upload)
router.put('/:id', uploadCourse, updateCourse);

// Archive course (soft delete)
router.patch('/:id/archive', archiveCourse);

// Unarchive course (restore)
router.patch('/:id/unarchive', unarchiveCourse);

// Toggle default status
router.patch('/:id/default', toggleDefaultStatus);

// Delete course (permanent hard delete)
router.delete('/:id', deleteCourse);

module.exports = router;

