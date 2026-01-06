const videoService = require('../services/video.services');

/**
 * @desc    Create new video
 * @route   POST /api/videos
 * @access  Private (Admin only)
 * 
 * Request (multipart/form-data):
 * - title: String (required)
 * - description: String (optional)
 * - duration: Number (optional) - in seconds
 * - starsAwarded: Number (optional, default: 10)
 * - badgeAwarded: String (optional) - Badge ID
 * - tags: JSON String (optional) - Array of tag strings
 * - videoFile: File (required) - Playable video file
 * - scormFile: File (required) - SCORM ZIP file from Adobe
 * - coverImage: File (optional) - Cover image/thumbnail for the video
 */
const createVideo = async (req, res) => {
  try {
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create videos',
      });
    }

    const video = await videoService.createVideo(userId, req.body, req.files);

    res.status(201).json({
      success: true,
      message: 'Video created successfully',
      data: video,
    });
  } catch (error) {
    const statusCode = error.message.includes('Invalid') || error.message.includes('required') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create video',
    });
  }
};

/**
 * @desc    Get all videos
 * @route   GET /api/videos
 * @access  Private (Admin only)
 * 
 * Query parameters:
 * - isActive: Filter by active status (true/false, default: true)
 * - search: Search in title/description
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 8)
 */
const getAllVideos = async (req, res) => {
  try {
    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access videos',
      });
    }

    const result = await videoService.getAllVideos(req.query);

    res.status(200).json({
      success: true,
      message: 'Videos retrieved successfully',
      data: result.videos,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve videos',
    });
  }
};

/**
 * @desc    Get single video by ID
 * @route   GET /api/videos/:id
 * @access  Private (Admin only)
 */
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access videos',
      });
    }

    const video = await videoService.getVideoById(id);

    res.status(200).json({
      success: true,
      message: 'Video retrieved successfully',
      data: video,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to retrieve video',
    });
  }
};

/**
 * @desc    Update video
 * @route   PUT /api/videos/:id
 * @access  Private (Admin only)
 * 
 * Request (multipart/form-data):
 * - title: String (optional)
 * - description: String (optional)
 * - duration: Number (optional) - in seconds
 * - starsAwarded: Number (optional)
 * - coverImage: File (optional) - New cover image/thumbnail
 */
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update videos',
      });
    }

    const video = await videoService.updateVideo(id, userId, req.body, req.files);

    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: video,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('Invalid') || error.message.includes('empty') ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update video',
    });
  }
};

/**
 * @desc    Delete video
 * @route   DELETE /api/videos/:id
 * @access  Private (Admin only)
 */
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete videos',
      });
    }

    const result = await videoService.deleteVideo(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to delete video',
    });
  }
};

module.exports = {
  createVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
};

