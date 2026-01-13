const { Media, Badge } = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * Create Video Service
 * 
 * Creates a new video with playable video file, optional SCORM file (from Adobe), and cover image
 * Videos can be video-only or video + SCORM interactive
 * 
 * @param {String} userId - Admin user's MongoDB ID
 * @param {Object} videoData - Video data
 * @param {Array} files - Uploaded files (from multer)
 * @returns {Object} Created video with populated media
 * @throws {Error} If validation fails
 */
const createVideo = async (userId, videoData, files = {}) => {
  const {
    title,
    description,
    duration,
    starsAwarded,
    badgeAwarded,
    tags,
    isPublished,
    requiredWatchCount,
  } = videoData;

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error('Please provide a video title');
  }

  // Validate video file is provided
  if (!files.videoFile || !Array.isArray(files.videoFile) || files.videoFile.length === 0) {
    throw new Error('Please provide a video file');
  }

  const videoFile = files.videoFile[0];
  const scormFile = files.scormFile && Array.isArray(files.scormFile) && files.scormFile.length > 0 ? files.scormFile[0] : null;

  // Validate badge if provided
  if (badgeAwarded) {
    const badge = await Badge.findById(badgeAwarded);
    if (!badge) {
      throw new Error('Invalid badge ID');
    }
  }

  // Process video file and create Media record
  const videoRelativePath = videoFile.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
  const videoFileUrl = `/uploads${videoRelativePath.startsWith('/') ? videoRelativePath : `/${videoRelativePath}`}`;
  
  const videoMedia = await Media.create({
    type: 'video',
    title: title?.trim() || videoFile.originalname, // Use provided title, fallback to filename
    description: description?.trim() || null,
    filePath: videoFile.path, // Keep full path for server operations (deletion, etc.)
    url: videoFileUrl, // Relative path for client access
    mimeType: videoFile.mimetype,
    size: videoFile.size,
    duration: duration ? parseInt(duration, 10) : null,
    starsAwarded: starsAwarded ? parseInt(starsAwarded, 10) : 10,
    requiredWatchCount: requiredWatchCount ? parseInt(requiredWatchCount, 10) : 5, // Default to 5
    isPublished: isPublished === 'true' || isPublished === true,
    uploadedBy: userId,
  });

  // Attach optional badge to the video media
  if (badgeAwarded) {
    videoMedia.badgeAwarded = badgeAwarded;
  }

  // Process SCORM file if provided (optional)
  if (scormFile) {
    const scormRelativePath = scormFile.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    const scormFileUrl = `/uploads${scormRelativePath.startsWith('/') ? scormRelativePath : `/${scormRelativePath}`}`;
    
    const scormMedia = await Media.create({
      type: 'video', // Using 'video' type for SCORM files
      title: scormFile.originalname,
      filePath: scormFile.path, // Keep full path for server operations
      url: scormFileUrl, // Relative path for client access
      mimeType: scormFile.mimetype,
      size: scormFile.size,
      uploadedBy: userId,
    });

    // Link SCORM file to video Media
    videoMedia.scormFile = scormMedia._id;
    videoMedia.scormFilePath = scormFile.path; // Keep full path for server operations
    videoMedia.scormFileUrl = scormFileUrl; // Relative path for client access
    videoMedia.scormFileSize = scormFile.size;
  }

  await videoMedia.save();

  // Process cover image if provided
  let coverImagePath = null;
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const coverRelativePath = coverImage.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    coverImagePath = `/uploads${coverRelativePath.startsWith('/') ? coverRelativePath : `/${coverRelativePath}`}`;
    videoMedia.thumbnail = coverImagePath;
    await videoMedia.save();
  }

  // Parse tags
  let parsedTags = [];
  if (tags) {
    try {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      if (!Array.isArray(parsedTags)) {
        parsedTags = [];
      }
    } catch (error) {
      parsedTags = [];
    }
  }

  videoMedia.tags = parsedTags.filter(t => t && t.trim()).map(t => t.trim());
  await videoMedia.save();

  // Get created video with populated data
  const createdVideo = await Media.findById(videoMedia._id)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('uploadedBy', 'name email')
    .lean();

  return createdVideo;
};

/**
 * Get All Videos Service
 * 
 * Retrieves all videos (Media with type='video') with optional filtering and pagination
 * Videos can have optional SCORM files
 * 
 * @param {Object} queryParams - Query parameters
 * @param {Boolean} [queryParams.isActive] - Filter by active status
 * @param {String} [queryParams.search] - Search in title/description
 * @param {Number} [queryParams.page] - Page number (default: 1)
 * @param {Number} [queryParams.limit] - Items per page (default: 10)
 * @returns {Object} Videos with pagination info
 */
const getAllVideos = async (queryParams = {}) => {
  const {
    isActive,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  // Build query - videos are Media with type='video' (SCORM is optional)
  const query = {
    type: 'video',
  };

  // Support both isActive and isPublished filters
  if (isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  } else {
    query.isActive = true; // Default to active only
  }

  // Also support isPublished filter (for consistency with other content types)
  if (queryParams.isPublished !== undefined) {
    query.isPublished = queryParams.isPublished === 'true' || queryParams.isPublished === true;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Get videos
  const videos = await Media.find(query)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const total = await Media.countDocuments(query);

  return {
    videos,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get Video By ID Service
 * 
 * Retrieves a single video by ID (SCORM is optional)
 * 
 * @param {String} videoId - Video's MongoDB ID (Media ID)
 * @returns {Object} Video with populated data
 * @throws {Error} If video not found
 */
const getVideoById = async (videoId) => {
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  })
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('uploadedBy', 'name email')
    .lean();

  if (!video) {
    throw new Error('Video not found');
  }

  return video;
};

/**
 * Update Video Service
 * 
 * Updates video fields: title, description, thumbnail (cover image), duration, starsAwarded
 * Video file and SCORM file cannot be changed
 * 
 * @param {String} videoId - Video's MongoDB ID
 * @param {String} userId - Admin user's MongoDB ID (for verification)
 * @param {Object} updateData - Data to update
 * @param {Array} files - Uploaded files (coverImage only)
 * @returns {Object} Updated video with populated data
 * @throws {Error} If video not found or validation fails
 */
const updateVideo = async (videoId, userId, updateData, files = {}) => {
  const {
    title,
    description,
    duration,
    starsAwarded,
    badgeAwarded,
    isPublished,
    requiredWatchCount,
  } = updateData;

  // Find video (SCORM is optional)
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  });

  if (!video) {
    throw new Error('Video not found');
  }

  // Update title
  if (title !== undefined) {
    if (!title || !title.trim()) {
      throw new Error('Title cannot be empty');
    }
    video.title = title.trim();
  }

  // Update description
  if (description !== undefined) {
    video.description = description?.trim() || null;
  }

  // Update duration
  if (duration !== undefined) {
    video.duration = duration ? parseInt(duration, 10) : null;
  }

  // Update stars awarded
  if (starsAwarded !== undefined) {
    const stars = parseInt(starsAwarded, 10);
    if (isNaN(stars) || stars < 0) {
      throw new Error('Stars awarded must be a non-negative number');
    }
    video.starsAwarded = stars;
  }

  // Update required watch count
  if (requiredWatchCount !== undefined) {
    const count = parseInt(requiredWatchCount, 10);
    if (isNaN(count) || count < 1) {
      throw new Error('Required watch count must be at least 1');
    }
    video.requiredWatchCount = count;
  }

  // Update published status
  if (isPublished !== undefined) {
    video.isPublished = isPublished === 'true' || isPublished === true;
  }

  // Update badge awarded
  if (badgeAwarded !== undefined) {
    if (badgeAwarded) {
      const badge = await Badge.findById(badgeAwarded);
      if (!badge) {
        throw new Error('Invalid badge ID');
      }
      video.badgeAwarded = badgeAwarded;
    } else {
      // Allow clearing the badge
      video.badgeAwarded = null;
    }
  }

  // Process cover image if provided
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const coverRelativePath = coverImage.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    const coverImagePath = `/uploads${coverRelativePath.startsWith('/') ? coverRelativePath : `/${coverRelativePath}`}`;
    video.thumbnail = coverImagePath;
  }

  await video.save();

  // Get updated video with populated data
  const updatedVideo = await Media.findById(videoId)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('uploadedBy', 'name email')
    .lean();

  return updatedVideo;
};

/**
 * Delete Video Service
 * 
 * Deletes a video (hard delete - removes from database)
 * Also deletes associated SCORM file if it exists
 * 
 * @param {String} videoId - Video's MongoDB ID
 * @returns {Object} Deleted video info
 * @throws {Error} If video not found
 */
const deleteVideo = async (videoId) => {
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  });

  if (!video) {
    throw new Error('Video not found');
  }

  // Delete video file if exists
  if (video.filePath && fs.existsSync(video.filePath)) {
    try {
      fs.unlinkSync(video.filePath);
    } catch (error) {
      console.error('Error deleting video file:', error);
    }
  }

  // Delete SCORM file if exists
  if (video.scormFile) {
    try {
      const scormMedia = await Media.findById(video.scormFile);
      if (scormMedia && scormMedia.filePath && fs.existsSync(scormMedia.filePath)) {
        fs.unlinkSync(scormMedia.filePath);
      }
      await Media.findByIdAndDelete(video.scormFile);
    } catch (error) {
      console.error('Error deleting SCORM file:', error);
    }
  }

  // Delete thumbnail if exists
  if (video.thumbnail && fs.existsSync(path.join(__dirname, '../', video.thumbnail.replace('/uploads', 'uploads')))) {
    try {
      fs.unlinkSync(path.join(__dirname, '../', video.thumbnail.replace('/uploads', 'uploads')));
    } catch (error) {
      console.error('Error deleting thumbnail:', error);
    }
  }

  await Media.findByIdAndDelete(videoId);

  return { message: 'Video deleted successfully', id: videoId };
};

module.exports = {
  createVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo,
};

