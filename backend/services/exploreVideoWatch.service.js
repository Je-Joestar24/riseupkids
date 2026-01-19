const { VideoWatch, ExploreContent, Media, ChildProfile, StarEarning, ChildStats } = require('../models');

/**
 * Mark explore video as watched (completed)
 * Awards stars on FIRST watch (except for replay videos)
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} exploreContentId - ExploreContent ID
 * @param {Number} [completionPercentage] - Optional completion percentage (0-100, default: 100)
 * @returns {Object} Watch result with star award info
 * @throws {Error} If explore content or child not found
 */
const markExploreVideoWatched = async (childId, exploreContentId, completionPercentage = 100) => {
  // Verify child exists
  const child = await ChildProfile.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  // Fetch ExploreContent by ID
  const exploreContent = await ExploreContent.findById(exploreContentId)
    .populate('videoFile', 'title type');

  if (!exploreContent) {
    throw new Error('Explore content not found');
  }

  // Verify it's a video type
  if (exploreContent.type !== 'video') {
    throw new Error('Explore content is not a video');
  }

  // Get videoFile (Media ID) from ExploreContent
  const videoId = exploreContent.videoFile?._id || exploreContent.videoFile;
  if (!videoId) {
    throw new Error('Video file not found in explore content');
  }

  // Check if videoType is 'replay' - skip star awards for replay videos
  const isReplay = exploreContent.videoType === 'replay';

  // Get or create VideoWatch record (using Media ID, not ExploreContent ID)
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

  // Track if stars were already awarded before this watch
  const starsWereAlreadyAwarded = videoWatch.starsAwarded;

  // Prevent duplicate watch recording within a short time window (5 seconds)
  // This prevents multiple API calls from incrementing the count multiple times
  const now = new Date();
  const recentWatchThreshold = 5000; // 5 seconds in milliseconds
  const lastWatchTime = videoWatch.watchHistory.length > 0 
    ? new Date(videoWatch.watchHistory[videoWatch.watchHistory.length - 1].watchedAt)
    : null;
  
  const timeSinceLastWatch = lastWatchTime 
    ? (now.getTime() - lastWatchTime.getTime())
    : Infinity;

  // Only increment if enough time has passed since last watch (or no previous watch)
  if (timeSinceLastWatch >= recentWatchThreshold) {
    // Increment watch count
    videoWatch.watchCount += 1;

    // Add to watch history
    videoWatch.watchHistory.push({
      watchedAt: now,
      completionPercentage: Math.max(0, Math.min(100, completionPercentage)),
    });
  } else {
    // Duplicate watch detected - log but don't increment
    console.log(`[ExploreVideoWatch] Duplicate watch detected for child ${childId}, video ${videoId}. Time since last watch: ${timeSinceLastWatch}ms. Skipping increment.`);
    // Return early with existing watch count (don't increment)
    await videoWatch.populate('video', 'title starsAwarded requiredWatchCount');
    return {
      videoWatch: videoWatch.toObject(),
      requiredWatchCount: 1,
      starsAwarded: videoWatch.starsAwarded,
      starsAwardedAt: videoWatch.starsAwardedAt,
      starsToAward: isReplay ? 0 : (exploreContent.starsAwarded || 10),
      starsJustAwarded: false,
      starsWereAlreadyAwarded,
      isReplay,
      duplicateWatch: true, // Flag to indicate this was a duplicate
    };
  }

  // For explore videos (non-replay), award stars on FIRST watch only
  // requiredWatchCount = 1 (not 5 like journey videos)
  const requiredWatchCount = 1;
  let starsJustAwarded = false;
  let starsToAward = 0;

  // Check if we should award stars:
  // 1. Not a replay video
  // 2. Stars haven't been awarded yet
  // 3. This is the first watch (watchCount >= 1)
  if (!isReplay && !videoWatch.starsAwarded && videoWatch.watchCount >= requiredWatchCount) {
    // Award stars using ExploreContent.starsAwarded (not Media.starsAwarded)
    starsToAward = exploreContent.starsAwarded || 10;

    try {
      // Create StarEarning record with source type 'explore_video'
      await StarEarning.create({
        child: childId,
        stars: starsToAward,
        source: {
          type: 'explore_video',
          contentId: exploreContentId, // Store ExploreContent ID, not Media ID
          contentType: 'ExploreContent',
          metadata: {
            exploreContentTitle: exploreContent.title,
            videoType: exploreContent.videoType,
            watchCount: videoWatch.watchCount,
            requiredWatchCount,
            videoTitle: exploreContent.videoFile?.title || exploreContent.title,
          },
        },
        description: `Earned ${starsToAward} stars for watching "${exploreContent.title}"`,
      });

      // Update ChildStats to accumulate total stars
      const childStats = await ChildStats.getOrCreate(childId);
      const previousTotalStars = childStats.totalStars || 0;
      await childStats.addStars(starsToAward);
      
      // Verify the stars were actually added
      await childStats.save();
      const updatedStats = await ChildStats.findById(childStats._id);
      
      if (updatedStats.totalStars !== previousTotalStars + starsToAward) {
        console.error(`[ExploreVideoWatch] Stars not properly added! Expected: ${previousTotalStars + starsToAward}, Got: ${updatedStats.totalStars}`);
        // Try to fix it manually
        updatedStats.totalStars = previousTotalStars + starsToAward;
        await updatedStats.save();
      }
      
      console.log(`[ExploreVideoWatch] Stars awarded: ${starsToAward} stars added to child ${childId} for explore video ${exploreContentId}. Total stars: ${previousTotalStars} -> ${updatedStats.totalStars}`);

      // Update VideoWatch record
      videoWatch.starsAwarded = true;
      videoWatch.starsAwardedAt = new Date();
      starsJustAwarded = true;
    } catch (error) {
      console.error(`[ExploreVideoWatch] Error awarding stars for explore video ${exploreContentId}, child ${childId}:`, error);
      // Don't throw - allow the watch to be recorded even if star awarding fails
      // This prevents blocking video watch tracking if there's a stats issue
    }
  }

  await videoWatch.save();

  // Populate video info
  await videoWatch.populate('video', 'title starsAwarded requiredWatchCount');

  return {
    videoWatch: videoWatch.toObject(),
    requiredWatchCount,
    starsAwarded: videoWatch.starsAwarded,
    starsAwardedAt: videoWatch.starsAwardedAt,
    starsToAward: starsToAward || (isReplay ? 0 : (exploreContent.starsAwarded || 10)),
    starsJustAwarded, // Flag to indicate stars were just awarded in this watch
    starsWereAlreadyAwarded, // Flag to indicate stars were already earned before
    isReplay, // Flag to indicate if this is a replay video
  };
};

/**
 * Get explore video watch status for a child
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} exploreContentId - ExploreContent ID
 * @returns {Object} Watch status with watch count and star award info
 * @throws {Error} If explore content not found
 */
const getExploreVideoWatchStatus = async (childId, exploreContentId) => {
  // Fetch ExploreContent by ID
  const exploreContent = await ExploreContent.findById(exploreContentId)
    .populate('videoFile', 'title type');

  if (!exploreContent) {
    throw new Error('Explore content not found');
  }

  // Verify it's a video type
  if (exploreContent.type !== 'video') {
    throw new Error('Explore content is not a video');
  }

  // Get videoFile (Media ID) from ExploreContent
  const videoId = exploreContent.videoFile?._id || exploreContent.videoFile;
  if (!videoId) {
    throw new Error('Video file not found in explore content');
  }

  // Check if videoType is 'replay'
  const isReplay = exploreContent.videoType === 'replay';

  // Get VideoWatch record (using Media ID, not ExploreContent ID)
  const videoWatch = await VideoWatch.findOne({
    child: childId,
    video: videoId,
  }).populate('video', 'title starsAwarded requiredWatchCount');

  // For explore videos, requiredWatchCount = 1 (not 5 like journey videos)
  const requiredWatchCount = 1;
  const currentWatchCount = videoWatch ? videoWatch.watchCount : 0;
  const starsAwarded = videoWatch ? videoWatch.starsAwarded : false;
  
  // Stars to award (0 for replay, ExploreContent.starsAwarded for others)
  const starsToAward = isReplay ? 0 : (exploreContent.starsAwarded || 10);

  return {
    exploreContentId,
    videoId: videoId.toString(),
    videoTitle: exploreContent.videoFile?.title || exploreContent.title,
    exploreContentTitle: exploreContent.title,
    videoType: exploreContent.videoType,
    isReplay,
    currentWatchCount,
    requiredWatchCount,
    starsAwarded,
    starsAwardedAt: videoWatch?.starsAwardedAt || null,
    starsToAward,
    watchHistory: videoWatch?.watchHistory || [],
  };
};

/**
 * Get total stars earned for a specific video type
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} videoType - Video type (e.g., 'replay', 'cooking', 'music', etc.)
 * @returns {Number} Total stars earned for this video type
 */
const getTotalStarsForVideoType = async (childId, videoType) => {
  // Verify child exists
  const child = await ChildProfile.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  // For replay videos, return 0 since they don't award stars
  if (videoType === 'replay') {
    return 0;
  }

  // Query StarEarning records for explore_video type with matching videoType in metadata
  const starEarnings = await StarEarning.find({
    child: childId,
    'source.type': 'explore_video',
    'source.contentType': 'ExploreContent',
    'source.metadata.videoType': videoType,
  }).lean();

  // Sum up all stars earned
  const totalStars = starEarnings.reduce((sum, earning) => {
    return sum + (earning.stars || 0);
  }, 0);

  return totalStars;
};

/**
 * Get progress for a specific video type
 * Returns total videos and count of watched videos
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {String} videoType - Video type (e.g., 'replay', 'cooking', 'music', etc.)
 * @returns {Object} Progress data with totalVideos and viewedVideos
 */
const getVideoTypeProgress = async (childId, videoType) => {
  // Verify child exists
  const child = await ChildProfile.findById(childId);
  if (!child) {
    throw new Error('Child not found');
  }

  // Get all ExploreContent for this video type (published videos only)
  const exploreContents = await ExploreContent.find({
    type: 'video',
    videoType: videoType,
    isPublished: true,
  })
    .populate('videoFile', '_id')
    .select('_id videoFile')
    .lean();

  const totalVideos = exploreContents.length;

  if (totalVideos === 0) {
    return {
      totalVideos: 0,
      viewedVideos: 0,
    };
  }

  // Extract video IDs (Media IDs) from ExploreContent
  const videoIds = exploreContents
    .map((content) => {
      const videoId = content.videoFile?._id || content.videoFile;
      return videoId ? videoId.toString() : null;
    })
    .filter((id) => id !== null);

  if (videoIds.length === 0) {
    return {
      totalVideos,
      viewedVideos: 0,
    };
  }

  // Get all VideoWatch records for these videos and this child
  // A video is considered "viewed" if watchCount > 0
  const videoWatches = await VideoWatch.find({
    child: childId,
    video: { $in: videoIds },
    watchCount: { $gt: 0 }, // Only count videos that have been watched at least once
  })
    .select('video watchCount')
    .lean();

  const viewedVideos = videoWatches.length;

  return {
    totalVideos,
    viewedVideos,
  };
};

module.exports = {
  markExploreVideoWatched,
  getExploreVideoWatchStatus,
  getTotalStarsForVideoType,
  getVideoTypeProgress,
};
