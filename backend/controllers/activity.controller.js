const activityService = require('../services/activity.services');

/**
 * @desc    Create new activity
 * @route   POST /api/activities
 * @access  Private (Admin only)
 * 
 * Request (multipart/form-data):
 * - title: String (required)
 * - description: String (optional)
 * - estimatedTime: Number (optional) - in minutes
 * - starsAwarded: Number (optional, default: 15)
 * - badgeAwarded: String (optional) - Badge ID
 * - tags: JSON String (optional) - Array of tag strings
 * - isPublished: Boolean (optional, default: false)
 * - scormFile: File (required) - SCORM ZIP file
 * - coverImage: File (optional) - Cover image for the activity
 */
const createActivity = async (req, res) => {
  try {
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create activities',
      });
    }

    const activity = await activityService.createActivity(userId, req.body, req.files);

    res.status(201).json({
      success: true,
      message: 'Activity created successfully',
      data: activity,
    });
  } catch (error) {
    const statusCode = error.message.includes('Invalid') || error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create activity',
    });
  }
};

/**
 * @desc    Get all activities
 * @route   GET /api/activities
 * @access  Private (Admin only)
 * 
 * Query parameters:
 * - isPublished: Filter by published status (true/false)
 * - isArchived: Filter by archived status (true/false, default: false)
 * - search: Search in title/description
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 8)
 */
const getAllActivities = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access activities',
      });
    }

    const result = await activityService.getAllActivities(req.query);

    res.status(200).json({
      success: true,
      message: 'Activities retrieved successfully',
      data: result.activities,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve activities',
    });
  }
};

/**
 * @desc    Get single activity by ID
 * @route   GET /api/activities/:id
 * @access  Private (Admin only)
 */
const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access activities',
      });
    }

    const activity = await activityService.getActivityById(id);

    res.status(200).json({
      success: true,
      message: 'Activity retrieved successfully',
      data: activity,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve activity',
    });
  }
};

/**
 * @desc    Update activity
 * @route   PUT /api/activities/:id
 * @access  Private (Admin only)
 * 
 * Request (multipart/form-data):
 * - title: String (optional)
 * - description: String (optional)
 * - starsAwarded: Number (optional)
 * - isPublished: Boolean (optional)
 * - coverImage: File (optional) - New cover image
 */
const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update activities',
      });
    }

    const activity = await activityService.updateActivity(id, userId, req.body, req.files);

    res.status(200).json({
      success: true,
      message: 'Activity updated successfully',
      data: activity,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('Invalid') || error.message.includes('empty') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update activity',
    });
  }
};

/**
 * @desc    Archive activity
 * @route   DELETE /api/activities/:id
 * @access  Private (Admin only)
 */
const archiveActivity = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can archive activities',
      });
    }

    const activity = await activityService.archiveActivity(id);

    res.status(200).json({
      success: true,
      message: 'Activity archived successfully',
      data: activity,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to archive activity',
    });
  }
};

/**
 * @desc    Restore archived activity
 * @route   PATCH /api/activities/:id/restore
 * @access  Private (Admin only)
 */
const restoreActivity = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can restore activities',
      });
    }

    const activity = await activityService.restoreActivity(id);

    res.status(200).json({
      success: true,
      message: 'Activity restored successfully',
      data: activity,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to restore activity',
    });
  }
};

module.exports = {
  createActivity,
  getAllActivities,
  getActivityById,
  updateActivity,
  archiveActivity,
  restoreActivity,
};

