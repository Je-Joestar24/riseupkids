const { VideoWatch, Media, ChildProfile, StarEarning } = require('../models');

/**
 * Mark video as watched (completed)
 * Increments watch count and awards stars when required count is reached
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} videoId - Video's MongoDB ID (Media ID)
 * @param {Number} [completionPercentage] - Optional completion percentage (0-100, default: 100)
 * @returns {Object} Updated VideoWatch record with watch info
 * @throws {Error} If video or child not found, or if video is not a video type
 */
const markVideoWatched = async (childId, videoId, completionPercentage = 100) => {
  // Verify child exists
  const child = await ChildProfile.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  // Verify video exists and is a video type
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  });

  if (!video) {
    throw new Error('Video not found');
  }

  // Get or create VideoWatch record
  let videoWatch = await VideoWatch.findOne({
    child: childId,
    video: videoId,
  });

  if (!videoWatch) {
    videoWatch = await VideoWatch.create({
      child: childId,
      video: videoId,
      watchCount: 0,
      starsAwarded: false,
    });
  }

  // Increment watch count
  videoWatch.watchCount += 1;

  // Add to watch history
  videoWatch.watchHistory.push({
    watchedAt: new Date(),
    completionPercentage: Math.max(0, Math.min(100, completionPercentage)),
  });

  // Get required watch count (default to 5 if not specified)
  const requiredWatchCount = video.requiredWatchCount || 5;

  // Check if we've reached the required watch count and stars haven't been awarded yet
  if (videoWatch.watchCount >= requiredWatchCount && !videoWatch.starsAwarded) {
    // Award stars
    const starsToAward = video.starsAwarded || 10;

    // Create StarEarning record
    await StarEarning.create({
      child: childId,
      stars: starsToAward,
      source: {
        type: 'video',
        contentId: videoId,
        contentType: 'Media',
        metadata: {
          videoTitle: video.title,
          watchCount: videoWatch.watchCount,
          requiredWatchCount,
        },
      },
      description: `Earned ${starsToAward} stars for watching "${video.title}" ${requiredWatchCount} times`,
    });

    // Update VideoWatch record
    videoWatch.starsAwarded = true;
    videoWatch.starsAwardedAt = new Date();
  }

  await videoWatch.save();

  // Populate video info
  await videoWatch.populate('video', 'title starsAwarded requiredWatchCount');

  return {
    videoWatch: videoWatch.toObject(),
    requiredWatchCount,
    starsAwarded: videoWatch.starsAwarded,
    starsAwardedAt: videoWatch.starsAwardedAt,
    starsToAward: video.starsAwarded || 10,
  };
};

/**
 * Get video watch status for a child
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} videoId - Video's MongoDB ID
 * @returns {Object} VideoWatch status with watch count and required count
 * @throws {Error} If video not found
 */
const getVideoWatchStatus = async (childId, videoId) => {
  // Verify video exists
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  });

  if (!video) {
    throw new Error('Video not found');
  }

  // Get VideoWatch record
  const videoWatch = await VideoWatch.findOne({
    child: childId,
    video: videoId,
  }).populate('video', 'title starsAwarded requiredWatchCount');

  const requiredWatchCount = video.requiredWatchCount || 5;
  const currentWatchCount = videoWatch ? videoWatch.watchCount : 0;
  const starsAwarded = videoWatch ? videoWatch.starsAwarded : false;

  return {
    videoId,
    videoTitle: video.title,
    currentWatchCount,
    requiredWatchCount,
    starsAwarded,
    starsAwardedAt: videoWatch?.starsAwardedAt || null,
    starsToAward: video.starsAwarded || 10,
    watchHistory: videoWatch?.watchHistory || [],
  };
};

/**
 * Get all video watch statuses for a child
 * 
 * @param {String} childId - Child's MongoDB ID
 * @returns {Array} Array of video watch statuses
 */
const getChildVideoWatches = async (childId) => {
  const videoWatches = await VideoWatch.find({ child: childId })
    .populate('video', 'title starsAwarded requiredWatchCount type')
    .sort({ updatedAt: -1 })
    .lean();

  return videoWatches.map((watch) => {
    const video = watch.video;
    const requiredWatchCount = video?.requiredWatchCount || 5;

    return {
      videoId: watch.video._id,
      videoTitle: video?.title || 'Unknown',
      currentWatchCount: watch.watchCount,
      requiredWatchCount,
      starsAwarded: watch.starsAwarded,
      starsAwardedAt: watch.starsAwardedAt,
      starsToAward: video?.starsAwarded || 10,
      watchHistory: watch.watchHistory || [],
      lastWatchedAt: watch.updatedAt,
    };
  });
};

/**
 * Reset video watch count for a child (admin/parent action)
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} videoId - Video's MongoDB ID
 * @returns {Object} Reset VideoWatch record
 * @throws {Error} If video or child not found
 */
const resetVideoWatch = async (childId, videoId) => {
  // Verify child exists
  const child = await ChildProfile.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  // Verify video exists
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  });

  if (!video) {
    throw new Error('Video not found');
  }

  // Get or create VideoWatch record
  let videoWatch = await VideoWatch.findOne({
    child: childId,
    video: videoId,
  });

  if (!videoWatch) {
    videoWatch = await VideoWatch.create({
      child: childId,
      video: videoId,
    });
  }

  // Reset watch count and stars awarded
  videoWatch.watchCount = 0;
  videoWatch.starsAwarded = false;
  videoWatch.starsAwardedAt = null;
  videoWatch.watchHistory = [];

  await videoWatch.save();

  return videoWatch.toObject();
};

module.exports = {
  markVideoWatched,
  getVideoWatchStatus,
  getChildVideoWatches,
  resetVideoWatch,
};
