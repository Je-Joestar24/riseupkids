const express = require('express');
const router = express.Router();
const {
  checkCourseAccess,
  getChildCourses,
  getCourseProgress,
  updateContentProgress,
  markCourseCompleted,
  getCourseDetailsForChild,
  submitBookCompletion,
} = require('../controllers/courseProgress.controller');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/course-progress/child/:childId
 * @desc    Get all courses with progress for a child
 * @access  Private (Parent/Admin)
 */
router.get('/child/:childId', getChildCourses);

/**
 * @route   GET /api/course-progress/:courseId/child/:childId/details
 * @desc    Get course details with populated contents and child profile
 * @access  Private (Parent/Admin)
 */
router.get('/:courseId/child/:childId/details', getCourseDetailsForChild);

/**
 * @route   GET /api/course-progress/:courseId/child/:childId
 * @desc    Get course progress for a specific child and course
 * @access  Private (Parent/Admin)
 */
router.get('/:courseId/child/:childId', getCourseProgress);

/**
 * @route   GET /api/course-progress/:courseId/access/:childId
 * @desc    Check if child can access a course
 * @access  Private (Parent/Admin)
 */
router.get('/:courseId/access/:childId', checkCourseAccess);

/**
 * @route   PATCH /api/course-progress/:courseId/child/:childId/content
 * @desc    Update course progress when content is completed
 * @access  Private (Parent/Admin)
 */
router.patch('/:courseId/child/:childId/content', updateContentProgress);

/**
 * @route   POST /api/course-progress/:courseId/child/:childId/book/:bookId/complete
 * @desc    Submit book reading completion
 * @access  Private (Parent/Admin)
 * 
 * NOTE: This route must come before the general /complete route to avoid route conflicts
 */
router.post('/:courseId/child/:childId/book/:bookId/complete', submitBookCompletion);

/**
 * @route   POST /api/course-progress/:courseId/child/:childId/complete
 * @desc    Mark course as completed manually
 * @access  Private (Parent/Admin)
 */
router.post('/:courseId/child/:childId/complete', markCourseCompleted);

module.exports = router;

