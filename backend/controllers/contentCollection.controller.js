const courseService = require('../services/contentCollection.services');

/**
 * @desc    Create new course/collection
 * @route   POST /api/courses
 * @access  Private (Admin only)
 * 
 * Request (multipart/form-data):
 * - title: String (required)
 * - description: String (optional)
 * - isPublished: Boolean (optional, default: false)
 * - tags: JSON String (optional) - Array of tag strings
 * - coverImage: File (optional) - Cover image for the course
 * - contents: JSON String (required) - Array of content items:
 *   [
 *     { contentId: "id", contentType: "activity" },  // Existing content
 *     { contentId: "id", contentType: "book" },
 *     // OR
 *     { newContent: { contentType: "activity", ... } }  // Create new content (future)
 *   ]
 */
const createCourse = async (req, res) => {
  try {
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create courses',
      });
    }

    // Parse contents if provided as JSON string
    let courseData = { ...req.body };
    if (courseData.contents && typeof courseData.contents === 'string') {
      try {
        courseData.contents = JSON.parse(courseData.contents);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid contents JSON format',
        });
      }
    }

    const course = await courseService.createCourse(userId, courseData, req.files);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course,
    });
  } catch (error) {
    const statusCode = error.message.includes('Invalid') || error.message.includes('required') || error.message.includes('not found') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create course',
    });
  }
};

/**
 * @desc    Get all courses/collections
 * @route   GET /api/courses
 * @access  Private (Admin only)
 * 
 * Query parameters:
 * - isPublished: Filter by published status (true/false)
 * - isArchived: Filter by archived status (true/false, default: false - excludes archived)
 * - search: Search in title/description
 * - sortBy: Sort order ('createdAt' for date created descending, 'order' for stepOrder ascending)
 *   Default: 'createdAt'. When sorting by 'order', courses without stepOrder fall back to createdAt
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
const getAllCourses = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access courses',
      });
    }

    const result = await courseService.getAllCourses(req.query);

    res.status(200).json({
      success: true,
      message: 'Courses retrieved successfully',
      data: result.courses,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve courses',
    });
  }
};

/**
 * @desc    Get single course by ID with populated contents
 * @route   GET /api/courses/:id
 * @access  Private (Admin only)
 */
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access courses',
      });
    }

    const course = await courseService.getCourseById(id);

    res.status(200).json({
      success: true,
      message: 'Course retrieved successfully',
      data: course,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve course',
    });
  }
};

/**
 * @desc    Update course
 * @route   PUT /api/courses/:id
 * @access  Private (Admin only)
 * 
 * Request (multipart/form-data):
 * - title: String (optional)
 * - description: String (optional)
 * - isPublished: Boolean (optional)
 * - tags: JSON String (optional) - Array of tag strings
 * - coverImage: File (optional) - New cover image
 * - contents: JSON String (optional) - New contents array for reordering/adding/removing
 */
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update courses',
      });
    }

    // Parse contents if provided as JSON string
    let updateData = { ...req.body };
    if (updateData.contents && typeof updateData.contents === 'string') {
      try {
        updateData.contents = JSON.parse(updateData.contents);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid contents JSON format',
        });
      }
    }

    const course = await courseService.updateCourse(id, userId, updateData, req.files);

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      data: course,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('Invalid') || error.message.includes('empty') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update course',
    });
  }
};

/**
 * @desc    Archive course (soft delete)
 * @route   PATCH /api/courses/:id/archive
 * @access  Private (Admin only)
 */
const archiveCourse = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can archive courses',
      });
    }

    const result = await courseService.archiveCourse(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('already') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to archive course',
    });
  }
};

/**
 * @desc    Unarchive course (restore)
 * @route   PATCH /api/courses/:id/unarchive
 * @access  Private (Admin only)
 */
const unarchiveCourse = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can unarchive courses',
      });
    }

    const result = await courseService.unarchiveCourse(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('not archived') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to unarchive course',
    });
  }
};

/**
 * @desc    Delete course (permanent hard delete)
 * @route   DELETE /api/courses/:id
 * @access  Private (Admin only)
 * 
 * WARNING: This permanently deletes the course and cannot be undone.
 * Consider using archive instead for soft delete.
 */
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete courses',
      });
    }

    const result = await courseService.deleteCourse(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete course',
    });
  }
};

/**
 * @desc    Get all default courses
 * @route   GET /api/courses/default
 * @access  Private (Admin only)
 */
const getDefaultCourses = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view default courses',
      });
    }

    const courses = await courseService.getDefaultCourses();

    res.status(200).json({
      success: true,
      data: courses,
      count: courses.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get default courses',
    });
  }
};

/**
 * @desc    Toggle default status of a course
 * @route   PATCH /api/courses/:id/default
 * @access  Private (Admin only)
 * 
 * Request body:
 * {
 *   "isDefault": true  // or false
 * }
 */
const toggleDefaultStatus = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can modify default course status',
      });
    }

    const { id } = req.params;
    const { isDefault } = req.body;

    if (typeof isDefault !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isDefault must be a boolean value',
      });
    }

    const course = await courseService.toggleDefaultStatus(id, isDefault);

    res.status(200).json({
      success: true,
      message: `Course ${isDefault ? 'marked as' : 'removed from'} default courses`,
      data: course,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to toggle default status',
    });
  }
};

/**
 * @desc    Reorder courses
 * @route   PATCH /api/courses/reorder
 * @access  Private (Admin only)
 * 
 * Request body:
 * {
 *   "courseIds": ["courseId1", "courseId2", "courseId3", ...],
 *   "startIndex": 0  // Optional: starting index for stepOrder (default: 0)
 * }
 */
const reorderCourses = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can reorder courses',
      });
    }

    const { courseIds, startIndex } = req.body;

    // Validate courseIds
    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'courseIds must be a non-empty array',
      });
    }

    // Validate startIndex if provided
    if (startIndex !== undefined && (typeof startIndex !== 'number' || startIndex < 0)) {
      return res.status(400).json({
        success: false,
        message: 'startIndex must be a non-negative number',
      });
    }

    const result = await courseService.reorderCourses(courseIds, startIndex || 0);

    res.status(200).json({
      success: true,
      message: 'Courses reordered successfully',
      data: result,
    });
  } catch (error) {
    const statusCode = 
      error.message.includes('not found') || 
      error.message.includes('must be') || 
      error.message.includes('Duplicate') 
        ? 400 
        : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to reorder courses',
    });
  }
};

module.exports = {
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
};

