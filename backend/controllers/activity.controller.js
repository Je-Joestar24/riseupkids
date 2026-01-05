const activityService = require('../services/activity.services');

/**
 * @desc    Create new activity
 * @route   POST /api/activities
 * @access  Private (Admin only)
 * 
 * Request (multipart/form-data):
 * - title: String (required)
 * - description: String (optional)
 * - instructions: String (required)
 * - type: String (required) - drawing, quiz, task, puzzle, matching, writing, other
 * - questions: JSON String (required for quiz type) - Array of question objects
 * - autoComplete: Boolean (optional)
 * - maxScore: Number (optional)
 * - estimatedTime: Number (optional) - in minutes
 * - starsAwarded: Number (optional, default: 15)
 * - badgeAwarded: String (optional) - Badge ID
 * - tags: JSON String (optional) - Array of tag strings
 * - isPublished: Boolean (optional, default: false)
 * - images: File[] (optional) - Image files
 * - videos: File[] (optional) - Video files
 * - audio: File[] (optional) - Audio files
 * 
 * Example questions for quiz type:
 * [
 *   {
 *     "question": "What is 2 + 2?",
 *     "options": ["3", "4", "5", "6"],
 *     "correctAnswer": 1,
 *     "points": 1
 *   }
 * ]
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
 * - type: Filter by activity type (drawing, quiz, task, puzzle, matching, writing, other)
 * - isPublished: Filter by published status (true/false)
 * - search: Search in title/description
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
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

module.exports = {
  createActivity,
  getAllActivities,
};

