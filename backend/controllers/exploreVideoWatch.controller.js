const exploreVideoWatchService = require('../services/exploreVideoWatch.service');
const { ChildProfile } = require('../models');

/**
 * @desc    Get total stars earned for a specific video type
 * @route   GET /api/explore/videos/video-type/:videoType/total-stars/child/:childId
 * @access  Private (Parent/Admin)
 */
const getTotalStarsForVideoType = async (req, res) => {
  try {
    const { videoType, childId } = req.params;

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

    const totalStars = await exploreVideoWatchService.getTotalStarsForVideoType(childId, videoType);

    res.status(200).json({
      success: true,
      data: {
        videoType,
        totalStars,
      },
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get total stars for video type',
    });
  }
};

/**
 * @desc    Mark explore video as watched (completed)
 * @route   POST /api/explore/videos/:exploreContentId/watch/child/:childId
 * @access  Private (Parent/Admin)
 * 
 * Request body:
 * - completionPercentage: Number (optional, 0-100, default: 100)
 */
const markExploreVideoWatched = async (req, res) => {
  try {
    const { exploreContentId, childId } = req.params;
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

    const result = await exploreVideoWatchService.markExploreVideoWatched(
      childId,
      exploreContentId,
      completionPercentage
    );

    res.status(200).json({
      success: true,
      message: 'Explore video watch recorded successfully',
      data: result,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to record explore video watch',
    });
  }
};

/**
 * @desc    Get explore video watch status for a child
 * @route   GET /api/explore/videos/:exploreContentId/watch-status/child/:childId
 * @access  Private (Parent/Admin)
 */
const getExploreVideoWatchStatus = async (req, res) => {
  try {
    const { exploreContentId, childId } = req.params;

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

    const status = await exploreVideoWatchService.getExploreVideoWatchStatus(childId, exploreContentId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get explore video watch status',
    });
  }
};

/**
 * @desc    Get progress for a specific video type (total videos and viewed videos count)
 * @route   GET /api/explore/videos/video-type/:videoType/progress/child/:childId
 * @access  Private (Parent/Admin)
 */
const getVideoTypeProgress = async (req, res) => {
  try {
    const { videoType, childId } = req.params;

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

    const progress = await exploreVideoWatchService.getVideoTypeProgress(childId, videoType);

    res.status(200).json({
      success: true,
      data: {
        videoType,
        ...progress,
      },
    });
  } catch (error) {
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get video type progress',
    });
  }
};

module.exports = {
  markExploreVideoWatched,
  getExploreVideoWatchStatus,
  getTotalStarsForVideoType,
  getVideoTypeProgress,
};
