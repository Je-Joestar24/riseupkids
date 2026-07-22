const { VideoWatch, Media, ChildProfile, StarEarning, ChildStats } = require('../models');
const { getStarsForSession } = require('../utils/contentStarDistribution.util');

/**
 * Award stars for a single watch session when not already recorded.
 */
async function awardStarsForWatchSession({
  childId,
  videoId,
  video,
  watchNumber,
  requiredWatchCount,
  totalStarsAvailable,
}) {
  if (watchNumber < 1 || watchNumber > requiredWatchCount) {
    return 0;
  }

  const legacyLumpSum = await StarEarning.findOne({
    child: childId,
    'source.type': 'video',
    'source.contentId': videoId,
    'source.metadata.watchNumber': { $exists: false },
  });

  if (legacyLumpSum) {
    return 0;
  }

  const existingForSession = await StarEarning.findOne({
    child: childId,
    'source.type': 'video',
    'source.contentId': videoId,
    'source.metadata.watchNumber': watchNumber,
  });

  if (existingForSession) {
    return 0;
  }

  const starsForSession = getStarsForSession(
    watchNumber,
    totalStarsAvailable,
    requiredWatchCount
  );

  if (starsForSession <= 0) {
    return 0;
  }

  await StarEarning.create({
    child: childId,
    stars: starsForSession,
    source: {
      type: 'video',
      contentId: videoId,
      contentType: 'Media',
      metadata: {
        videoTitle: video.title,
        watchNumber,
        requiredWatchCount,
        totalStarsAvailable,
      },
    },
    description: `Earned ${starsForSession} stars for watching "${video.title}" (watch ${watchNumber} of ${requiredWatchCount})`,
  });

  const childStats = await ChildStats.getOrCreate(childId);
  const previousTotalStars = childStats.totalStars || 0;
  await childStats.addStars(starsForSession);
  await childStats.save();

  const updatedStats = await ChildStats.findById(childStats._id);
  if (updatedStats.totalStars !== previousTotalStars + starsForSession) {
    updatedStats.totalStars = previousTotalStars + starsForSession;
    await updatedStats.save();
  }

  try {
    const badgeCheck = require('./badgeCheck.service');
    await badgeCheck.updateBadges(childId, { silent: false });
  } catch (badgeError) {
    console.error('[VideoWatch] Error checking badges after star award:', badgeError);
  }

  return starsForSession;
}

/**
 * Mark video as watched (completed)
 * Increments watch count and awards stars per watch session
 *
 * @param {String} childId - Child's MongoDB ID
 * @param {String} videoId - Video's MongoDB ID (Media ID)
 * @param {Number} [completionPercentage] - Optional completion percentage (0-100, default: 100)
 * @returns {Object} Updated VideoWatch record with watch info
 * @throws {Error} If video or child not found, or if video is not a video type
 */
const markVideoWatched = async (childId, videoId, completionPercentage = 100) => {
  const child = await ChildProfile.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  });

  if (!video) {
    throw new Error('Video not found');
  }

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

  const now = new Date();
  const recentWatchThreshold = 5000;
  const lastWatchTime = videoWatch.watchHistory.length > 0
    ? new Date(videoWatch.watchHistory[videoWatch.watchHistory.length - 1].watchedAt)
    : null;

  const timeSinceLastWatch = lastWatchTime
    ? (now.getTime() - lastWatchTime.getTime())
    : Infinity;

  let isDuplicateWatch = false;
  let starsEarnedThisSession = 0;
  const requiredWatchCount = video.requiredWatchCount || 5;
  const totalStarsAvailable = video.starsAwarded || 10;

  if (timeSinceLastWatch >= recentWatchThreshold) {
    videoWatch.watchCount += 1;

    videoWatch.watchHistory.push({
      watchedAt: now,
      completionPercentage: Math.max(0, Math.min(100, completionPercentage)),
    });

    if (videoWatch.watchCount <= requiredWatchCount) {
      starsEarnedThisSession = await awardStarsForWatchSession({
        childId,
        videoId,
        video,
        watchNumber: videoWatch.watchCount,
        requiredWatchCount,
        totalStarsAvailable,
      });
    }

    if (videoWatch.watchCount >= requiredWatchCount) {
      videoWatch.starsAwarded = true;
      if (!videoWatch.starsAwardedAt) {
        videoWatch.starsAwardedAt = new Date();
      }
    }
  } else {
    console.log(
      `[VideoWatch] Duplicate watch detected for child ${childId}, video ${videoId}. Time since last watch: ${timeSinceLastWatch}ms. Skipping increment.`
    );
    isDuplicateWatch = true;
  }

  await videoWatch.save();
  await videoWatch.populate('video', 'title starsAwarded requiredWatchCount');

  const nextWatchNumber = Math.min(videoWatch.watchCount + 1, requiredWatchCount);
  const starsForNextSession = videoWatch.watchCount < requiredWatchCount
    ? getStarsForSession(nextWatchNumber, totalStarsAvailable, requiredWatchCount)
    : 0;

  return {
    videoWatch: videoWatch.toObject(),
    requiredWatchCount,
    starsAwarded: starsEarnedThisSession > 0,
    allStarsAwarded: videoWatch.starsAwarded,
    starsAwardedAt: videoWatch.starsAwardedAt,
    starsToAward: starsEarnedThisSession,
    starsEarnedThisSession,
    starsForNextSession,
    totalStarsAvailable,
    isDuplicateWatch,
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
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  });

  if (!video) {
    throw new Error('Video not found');
  }

  const videoWatch = await VideoWatch.findOne({
    child: childId,
    video: videoId,
  }).populate('video', 'title starsAwarded requiredWatchCount');

  const requiredWatchCount = video.requiredWatchCount || 5;
  const currentWatchCount = videoWatch ? videoWatch.watchCount : 0;
  const allStarsAwarded = videoWatch ? videoWatch.starsAwarded : false;
  const totalStarsAvailable = video.starsAwarded || 10;
  const nextWatchNumber = Math.min(currentWatchCount + 1, requiredWatchCount);
  const starsForNextSession = currentWatchCount < requiredWatchCount
    ? getStarsForSession(nextWatchNumber, totalStarsAvailable, requiredWatchCount)
    : 0;

  return {
    videoId,
    videoTitle: video.title,
    currentWatchCount,
    requiredWatchCount,
    starsAwarded: allStarsAwarded,
    allStarsAwarded,
    starsAwardedAt: videoWatch?.starsAwardedAt || null,
    starsToAward: starsForNextSession,
    starsForNextSession,
    totalStarsAvailable,
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
    const totalStarsAvailable = video?.starsAwarded || 10;
    const nextWatchNumber = Math.min(watch.watchCount + 1, requiredWatchCount);
    const starsForNextSession = watch.watchCount < requiredWatchCount
      ? getStarsForSession(nextWatchNumber, totalStarsAvailable, requiredWatchCount)
      : 0;

    return {
      videoId: watch.video._id,
      videoTitle: video?.title || 'Unknown',
      currentWatchCount: watch.watchCount,
      requiredWatchCount,
      starsAwarded: watch.starsAwarded,
      allStarsAwarded: watch.starsAwarded,
      starsAwardedAt: watch.starsAwardedAt,
      starsToAward: starsForNextSession,
      starsForNextSession,
      totalStarsAvailable,
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
  const child = await ChildProfile.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  });

  if (!video) {
    throw new Error('Video not found');
  }

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
  awardStarsForWatchSession,
};
