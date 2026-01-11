const courseProgressService = require('../services/courseProgress.services');
const { ChildProfile } = require('../models');

/**
 * @desc    Check if child can access a course
 * @route   GET /api/course-progress/:courseId/access/:childId
 * @access  Private (Parent/Admin)
 */
const checkCourseAccess = async (req, res) => {
  try {
    const { courseId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const accessInfo = await courseProgressService.checkCourseAccess(childId, courseId);

    res.status(200).json({
      success: true,
      data: accessInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to check course access',
    });
  }
};

/**
 * @desc    Get all courses with progress for a child
 * @route   GET /api/course-progress/child/:childId
 * @access  Private (Parent/Admin)
 */
const getChildCourses = async (req, res) => {
  try {
    const { childId } = req.params;
    const queryParams = req.query;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const courses = await courseProgressService.getChildCourses(childId, queryParams);

    res.status(200).json({
      success: true,
      data: courses,
      count: courses.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get child courses',
    });
  }
};

/**
 * @desc    Get course progress for a specific child and course
 * @route   GET /api/course-progress/:courseId/child/:childId
 * @access  Private (Parent/Admin)
 */
const getCourseProgress = async (req, res) => {
  try {
    const { courseId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const progressInfo = await courseProgressService.getCourseProgress(childId, courseId);

    res.status(200).json({
      success: true,
      data: progressInfo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get course progress',
    });
  }
};

/**
 * @desc    Update course progress when content is completed
 * @route   PATCH /api/course-progress/:courseId/child/:childId/content
 * @access  Private (Parent/Admin)
 */
const updateContentProgress = async (req, res) => {
  try {
    const { courseId, childId } = req.params;
    const { contentId, contentType } = req.body;

    if (!contentId || !contentType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide contentId and contentType',
      });
    }

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const progress = await courseProgressService.updateContentProgress(
      childId,
      courseId,
      contentId,
      contentType
    );

    res.status(200).json({
      success: true,
      message: 'Content progress updated successfully',
      data: progress,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('locked') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update content progress',
    });
  }
};

/**
 * @desc    Mark course as completed manually
 * @route   POST /api/course-progress/:courseId/child/:childId/complete
 * @access  Private (Parent/Admin)
 */
const markCourseCompleted = async (req, res) => {
  try {
    const { courseId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const progress = await courseProgressService.markCourseCompleted(childId, courseId);

    res.status(200).json({
      success: true,
      message: 'Course marked as completed',
      data: progress,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('locked') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to mark course as completed',
    });
  }
};

/**
 * @desc    Get course details with populated contents for a child
 * @route   GET /api/course-progress/:courseId/child/:childId/details
 * @access  Private (Parent/Admin)
 */
const getCourseDetailsForChild = async (req, res) => {
  try {
    const { courseId, childId } = req.params;

    // Verify child belongs to parent (if user is parent)
    if (req.user.role === 'parent') {
      const child = await ChildProfile.findOne({
        _id: childId,
        parent: req.user._id,
      });

      if (!child) {
        return res.status(403).json({
          success: false,
          message: 'Child not found or does not belong to you',
        });
      }
    }

    const courseDetails = await courseProgressService.getCourseDetailsForChild(childId, courseId);

    res.status(200).json({
      success: true,
      data: courseDetails,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get course details',
    });
  }
};

module.exports = {
  checkCourseAccess,
  getChildCourses,
  getCourseProgress,
  updateContentProgress,
  markCourseCompleted,
  getCourseDetailsForChild,
};

