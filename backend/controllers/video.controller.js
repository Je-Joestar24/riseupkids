const videoService = require('../services/video.services');

const CONTENT_MANAGER_ROLES = ['admin', 'teacher', 'content_creator'];

function isVideoBadRequest(message) {
  const m = String(message || '');
  return /invalid|required|provide|embedurl|https|do not attach|must be|not a valid|too long|path must|not supported|empty|cannot|only be updated/i.test(
    m
  );
}

function resolveErrorStatus(error, { notFound = 404, fallback = 500 } = {}) {
  if (error?.statusCode === 403) return 403;
  const message = String(error?.message || '');
  if (message.includes('not found')) return notFound;
  if (isVideoBadRequest(message)) return 400;
  return fallback;
}

/**
 * @desc    Create new video
 * @route   POST /api/videos
 * @access  Private (Admin/Teacher/Content creator)
 */
const createVideo = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can create videos',
      });
    }

    const video = await videoService.createVideo(userId, req.body, req.files);

    res.status(201).json({
      success: true,
      message: 'Video created successfully',
      data: video,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error, { fallback: 500 })).json({
      success: false,
      message: error.message || 'Failed to create video',
    });
  }
};

/**
 * @desc    Get all videos
 * @route   GET /api/videos
 * @access  Private (Admin/Teacher/Content creator)
 */
const getAllVideos = async (req, res) => {
  try {
    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can access videos',
      });
    }

    const result = await videoService.getAllVideos({ ...req.query, user: req.user });

    res.status(200).json({
      success: true,
      message: 'Videos retrieved successfully',
      data: result.videos,
      pagination: result.pagination,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to retrieve videos',
    });
  }
};

/**
 * @desc    Get single video by ID
 * @route   GET /api/videos/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can access videos',
      });
    }

    const video = await videoService.getVideoById(id, req.user);

    res.status(200).json({
      success: true,
      message: 'Video retrieved successfully',
      data: video,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to retrieve video',
    });
  }
};

/**
 * @desc    Update video
 * @route   PUT /api/videos/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can update videos',
      });
    }

    const video = await videoService.updateVideo(id, userId, req.body, req.files, req.user);

    res.status(200).json({
      success: true,
      message: 'Video updated successfully',
      data: video,
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
      success: false,
      message: error.message || 'Failed to update video',
    });
  }
};

/**
 * @desc    Delete video
 * @route   DELETE /api/videos/:id
 * @access  Private (Admin/Teacher/Content creator)
 */
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!CONTENT_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins, teachers, and content creators can delete videos',
      });
    }

    const result = await videoService.deleteVideo(id, req.user);

    res.status(200).json({
      success: true,
      message: result.message,
      data: { id: result.id },
    });
  } catch (error) {
    res.status(resolveErrorStatus(error)).json({
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
