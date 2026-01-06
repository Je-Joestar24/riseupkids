const { Media, Badge } = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * Create Video Service
 * 
 * Creates a new video with playable video file, SCORM file (from Adobe), and cover image
 * Videos have dual content: playable video + SCORM interactive
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
  } = videoData;

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error('Please provide a video title');
  }

  // Validate video file is provided
  if (!files.videoFile || !Array.isArray(files.videoFile) || files.videoFile.length === 0) {
    throw new Error('Please provide a video file');
  }

  // Validate SCORM file is provided
  if (!files.scormFile || !Array.isArray(files.scormFile) || files.scormFile.length === 0) {
    throw new Error('Please provide a SCORM file (ZIP format) from Adobe');
  }

  const videoFile = files.videoFile[0];
  const scormFile = files.scormFile[0];

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
    title: videoFile.originalname,
    filePath: videoFile.path,
    url: videoFileUrl,
    mimeType: videoFile.mimetype,
    size: videoFile.size,
    duration: duration ? parseInt(duration, 10) : null,
    uploadedBy: userId,
  });

  // Process SCORM file and create Media record
  const scormRelativePath = scormFile.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
  const scormFileUrl = `/uploads${scormRelativePath.startsWith('/') ? scormRelativePath : `/${scormRelativePath}`}`;
  
  const scormMedia = await Media.create({
    type: 'video', // Using 'video' type for SCORM files
    title: scormFile.originalname,
    filePath: scormFile.path,
    url: scormFileUrl,
    mimeType: scormFile.mimetype,
    size: scormFile.size,
    uploadedBy: userId,
  });

  // Link SCORM file to video Media
  videoMedia.scormFile = scormMedia._id;
  videoMedia.scormFilePath = scormFile.path;
  videoMedia.scormFileUrl = scormFileUrl;
  videoMedia.scormFileSize = scormFile.size;
  videoMedia.starsAwarded = starsAwarded ? parseInt(starsAwarded, 10) : 10;
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
 * Retrieves all videos (Media with type='video' and scormFile exists) with optional filtering and pagination
 * 
 * @param {Object} queryParams - Query parameters
 * @param {Boolean} [queryParams.isActive] - Filter by active status
 * @param {String} [queryParams.search] - Search in title/description
 * @param {Number} [queryParams.page] - Page number (default: 1)
 * @param {Number} [queryParams.limit] - Items per page (default: 8)
 * @returns {Object} Videos with pagination info
 */
const getAllVideos = async (queryParams = {}) => {
  const {
    isActive,
    search,
    page = 1,
    limit = 8,
  } = queryParams;

  // Build query - videos are Media with type='video' and scormFile exists
  const query = {
    type: 'video',
    scormFile: { $exists: true, $ne: null },
  };

  if (isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  } else {
    query.isActive = true; // Default to active only
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 8;
  const skip = (pageNum - 1) * limitNum;

  // Get videos
  const videos = await Media.find(query)
    .populate('scormFile', 'type title url mimeType size')
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
 * Retrieves a single video by ID
 * 
 * @param {String} videoId - Video's MongoDB ID (Media ID)
 * @returns {Object} Video with populated data
 * @throws {Error} If video not found
 */
const getVideoById = async (videoId) => {
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
    scormFile: { $exists: true, $ne: null },
  })
    .populate('scormFile', 'type title url mimeType size')
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
  } = updateData;

  // Find video
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
    scormFile: { $exists: true, $ne: null },
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
    .populate('uploadedBy', 'name email')
    .lean();

  return updatedVideo;
};

/**
 * Delete Video Service
 * 
 * Deletes a video (hard delete - removes from database)
 * Also deletes associated SCORM file
 * 
 * @param {String} videoId - Video's MongoDB ID
 * @returns {Object} Deleted video info
 * @throws {Error} If video not found
 */
const deleteVideo = async (videoId) => {
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
    scormFile: { $exists: true, $ne: null },
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

