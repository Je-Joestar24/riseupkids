const videoService = require('../services/video.services');

function isVideoBadRequest(message) {
  const m = String(message || '');
  return /invalid|required|provide|embedurl|https|do not attach|must be|not a valid|too long|path must|not supported|empty|cannot|only be updated/i.test(
    m
  );
}

/**
 * @desc    Create new video
 * @route   POST /api/videos
 * @access  Private (Admin/Teacher only)
 * 
 * Request (multipart/form-data):
 * - title: String (required)
 * - description: String (optional)
 * - duration: Number (optional) - in seconds
 * - starsAwarded: Number (optional, default: 10)
 * - requiredWatchCount: Number (optional, default: 5) - Number of times video must be watched to earn stars
 * - badgeAwarded: String (optional) - Badge ID
 * - tags: JSON String (optional) - Array of tag strings
 * - videoSource: String (optional, default: upload) - `upload` | `embed` (Bunny iframe)
 * - embedUrl: String (required when videoSource is embed) - HTTPS iframe.mediadelivery.net/embed/…
 * - videoFile: File (required when videoSource is upload) - Playable video file
 * - scormFile: File (optional, upload only) - SCORM ZIP (not allowed with embed)
 * - coverImage: File (optional) - Cover image/thumbnail for the video
 */
const createVideo = async (req, res) => {
  try {
    const userId = req.user._id;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can create videos',
      });
    }

    const video = await videoService.createVideo(userId, req.body, req.files);

    res.status(201).json({
      success: true,
      message: 'Video created successfully',
      data: video,
    });
  } catch (error) {
    const statusCode = isVideoBadRequest(error.message) ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create video',
    });
  }
};

/**
 * @desc    Get all videos
 * @route   GET /api/videos
 * @access  Private (Admin/Teacher only)
 * 
 * Query parameters:
 * - isActive: Filter by active status (true/false, default: true)
 * - isPublished: Filter by published status (true/false)
 * - search: Search in title/description
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 */
const getAllVideos = async (req, res) => {
  try {
    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can access videos',
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
 * @access  Private (Admin/Teacher only)
 */
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can access videos',
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
 * @access  Private (Admin/Teacher only)
 * 
 * Request (multipart/form-data):
 * - title: String (optional)
 * - description: String (optional)
 * - duration: Number (optional) - in seconds
 * - starsAwarded: Number (optional)
 * - requiredWatchCount: Number (optional) - Number of times video must be watched to earn stars
 * - coverImage: File (optional) - New cover image/thumbnail
 * - embedUrl: String (optional) - New Bunny embed URL (only when the video was created as embed)
 */
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can update videos',
      });
    }

    const video = await videoService.updateVideo(id, userId, req.body, req.files);

    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: video,
    });
  } catch (error) {
    const msg = error.message || '';
    const statusCode = msg.includes('not found') ? 404 : isVideoBadRequest(msg) ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update video',
    });
  }
};

/**
 * @desc    Delete video
 * @route   DELETE /api/videos/:id
 * @access  Private (Admin/Teacher only)
 */
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is admin/teacher
    if (!['admin', 'teacher'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and teachers can delete videos',
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

