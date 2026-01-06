const express = require('express');
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
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
 * - GET /:id - Get single course by ID (with populated contents)
 * - PUT /:id - Update course (title, description, coverImage, isPublished, tags, contents reorder)
 * - DELETE /:id - Delete course (hard delete)
 */

// All routes require authentication
router.use(protect);

// All routes require admin role
router.use(authorize('admin'));

// Create new course (with cover image upload)
router.post('/', uploadCourse, createCourse);

// Get all courses
router.get('/', getAllCourses);

// Get single course by ID
router.get('/:id', getCourseById);

// Update course (with optional cover image upload)
router.put('/:id', uploadCourse, updateCourse);

// Delete course
router.delete('/:id', deleteCourse);

module.exports = router;

