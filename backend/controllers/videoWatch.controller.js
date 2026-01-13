const videoWatchService = require('../services/videoWatch.service');
const { ChildProfile } = require('../models');

/**
 * @desc    Mark video as watched (completed)
 * @route   POST /api/video-watch/:videoId/child/:childId
 * @access  Private (Parent/Admin)
 * 
 * Request body:
 * - completionPercentage: Number (optional, 0-100, default: 100)
 */
const markVideoWatched = async (req, res) => {
  try {
    const { videoId, childId } = req.params;
    const { completionPercentage } = req.body;

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

    const result = await videoWatchService.markVideoWatched(
      childId,
      videoId,
      completionPercentage
    );

    res.status(200).json({
      success: true,
      message: 'Video watch recorded successfully',
      data: result,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to record video watch',
    });
  }
};

/**
 * @desc    Get video watch status for a child
 * @route   GET /api/video-watch/:videoId/child/:childId
 * @access  Private (Parent/Admin)
 */
const getVideoWatchStatus = async (req, res) => {
  try {
    const { videoId, childId } = req.params;

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

    const status = await videoWatchService.getVideoWatchStatus(childId, videoId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get video watch status',
    });
  }
};

/**
 * @desc    Get all video watch statuses for a child
 * @route   GET /api/video-watch/child/:childId
 * @access  Private (Parent/Admin)
 */
const getChildVideoWatches = async (req, res) => {
  try {
    const { childId } = req.params;

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

    const watches = await videoWatchService.getChildVideoWatches(childId);

    res.status(200).json({
      success: true,
      data: watches,
      count: watches.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get child video watches',
    });
  }
};

/**
 * @desc    Reset video watch count for a child
 * @route   DELETE /api/video-watch/:videoId/child/:childId
 * @access  Private (Parent/Admin)
 */
const resetVideoWatch = async (req, res) => {
  try {
    const { videoId, childId } = req.params;

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

    const result = await videoWatchService.resetVideoWatch(childId, videoId);

    res.status(200).json({
      success: true,
      message: 'Video watch count reset successfully',
      data: result,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to reset video watch',
    });
  }
};

module.exports = {
  markVideoWatched,
  getVideoWatchStatus,
  getChildVideoWatches,
  resetVideoWatch,
};
