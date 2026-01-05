const courseService = require('../services/course.services');

/**
 * @desc    Create new activity group
 * @route   POST /api/courses/activity-groups
 * @access  Private (Admin only)
 * 
 * Request body:
 * {
 *   "title": "Art Activities",
 *   "description": "Fun art activities for kids",
 *   "activities": ["activity_id_1", "activity_id_2", "activity_id_3"],
 *   "coverImage": "path/to/image.png",
 *   "category": "Arts & Crafts",
 *   "order": 1,
 *   "starsAwarded": 50,
 *   "badgeAwarded": "badge_id",
 *   "isFeatured": true,
 *   "isPublished": true,
 *   "tags": ["art", "creative", "fun"]
 * }
 */
const createActivityGroup = async (req, res) => {
  try {
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create activity groups',
      });
    }

    const activityGroup = await courseService.createActivityGroup(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Activity group created successfully',
      data: activityGroup,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('Invalid') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create activity group',
    });
  }
};

/**
 * @desc    Get activity group with activities
 * @route   GET /api/courses/activity-groups/:id
 * @access  Private (Admin only)
 * 
 * Query parameters:
 * - includeUnpublished: Include unpublished activities (admin only, default: false)
 */
const getActivityGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access activity groups',
      });
    }

    // Check if admin wants to include unpublished activities
    const includeUnpublished = req.query.includeUnpublished === 'true' && req.user.role === 'admin';

    const activityGroup = await courseService.getActivityGroupById(id, {
      includeUnpublished,
    });

    res.status(200).json({
      success: true,
      message: 'Activity group retrieved successfully',
      data: activityGroup,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve activity group',
    });
  }
};

module.exports = {
  createActivityGroup,
  getActivityGroupById,
};

