const { ExploreContent, Media } = require('../models');
const fs = require('fs');
const s3Service = require('./s3.service');
const { assertBunnyIframeEmbedUrl } = require('../utils/bunnyEmbed.util');
const { applyCreatorOwnershipFilter, assertCreatorOwnsDocument } = require('../utils/contentOwnership');
const { EXPLORE_VIDEO_MEDIA_TAG } = require('../constants/exploreVideoTypes');

/** Fields returned on populated explore `videoFile` (upload + Bunny embed). */
const VIDEO_FILE_POPULATE_SELECT =
  'type title url mimeType size duration thumbnail videoSource embedUrl';

/** Collect temp disk paths from multer (diskStorage) for cleanup after S3/DB work. */
const collectMulterDiskPaths = (files) => {
  const out = [];
  if (!files || typeof files !== 'object') return out;
  for (const key of ['videoFile', 'coverImage']) {
    const arr = files[key];
    if (!Array.isArray(arr)) continue;
    for (const f of arr) {
      if (f && f.path) out.push(f.path);
    }
  }
  return out;
};

/**
 * Create Explore Content Service
 * 
 * Creates new explore content with either an uploaded video file or a Bunny Stream iframe embed URL.
 * 
 * @param {String} userId - Admin user's MongoDB ID
 * @param {Object} contentData - Content data
 * @param {Object} files - Uploaded files (from multer)
 * @returns {Object} Created explore content with populated data
 * @throws {Error} If validation fails
 */
const createExploreContent = async (userId, contentData, files = {}) => {
  const tempDiskPaths = collectMulterDiskPaths(files);

  try {
  const {
    title,
    description,
    type = 'video',
    videoType = 'replay',
    videoSource: videoSourceRaw,
    embedUrl: embedUrlRaw,
    category,
    starsAwarded,
    totalItems,
    order,
    isFeatured,
    isPublished,
    tags,
    duration,
  } = contentData;

  const videoSource =
    typeof videoSourceRaw === 'string' && videoSourceRaw.trim().toLowerCase() === 'embed'
      ? 'embed'
      : 'upload';

  // Validate videoType for new enum values
  const validVideoTypes = ['replay', 'arts_crafts', 'cooking', 'music', 'movement_fitness', 'story_time', 'manners_etiquette'];
  if (type === 'video' && videoType && !validVideoTypes.includes(videoType)) {
    throw new Error(`Invalid videoType. Must be one of: ${validVideoTypes.join(', ')}`);
  }

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error('Please provide a title');
  }

  const hasVideoFile =
    files.videoFile && Array.isArray(files.videoFile) && files.videoFile.length > 0;

  // For video type, require either upload or validated Bunny embed URL
  if (type === 'video') {
    if (videoSource === 'embed') {
      if (hasVideoFile) {
        throw new Error('Do not attach a video file when using videoSource embed');
      }
    } else if (!hasVideoFile) {
      throw new Error('Please provide a video file');
    }
  }

  // Process video (upload or embed) and create Media record
  let videoMedia = null;
  let videoFilePath = null;
  let videoFileUrl = null;

  if (type === 'video' && videoSource === 'embed') {
    const canonicalEmbed = assertBunnyIframeEmbedUrl(embedUrlRaw);
    videoFileUrl = canonicalEmbed;
    videoFilePath = null;
    videoMedia = await Media.create({
      type: 'video',
      videoSource: 'embed',
      embedUrl: canonicalEmbed,
      cloudUrl: canonicalEmbed,
      title: title?.trim() || 'Embedded video',
      description: description?.trim() || null,
      duration: duration ? parseInt(duration, 10) : null,
      starsAwarded: starsAwarded ? parseInt(starsAwarded, 10) : 10,
      isPublished: isPublished === 'true' || isPublished === true,
      uploadedBy: userId,
      tags: [EXPLORE_VIDEO_MEDIA_TAG],
    });
  } else if (hasVideoFile) {
    const videoFile = files.videoFile[0];
    let videoByteSize = typeof videoFile.size === 'number' ? videoFile.size : 0;
    if ((!videoByteSize || videoByteSize < 0) && videoFile.path) {
      try {
        const st = await fs.promises.stat(videoFile.path);
        videoByteSize = st.size;
      } catch (_) {
        videoByteSize = 0;
      }
    }
    const { url: videoUrl, s3Key: videoS3Key } = await s3Service.uploadFileFromMulter(videoFile, 'media/videos');
    videoFileUrl = videoUrl;
    videoFilePath = videoS3Key;
    videoMedia = await Media.create({
      type: 'video',
      videoSource: 'upload',
      title: title?.trim() || videoFile.originalname,
      description: description?.trim() || null,
      filePath: videoS3Key,
      url: videoFileUrl,
      mimeType: videoFile.mimetype,
      size: videoByteSize,
      duration: duration ? parseInt(duration, 10) : null,
      starsAwarded: starsAwarded ? parseInt(starsAwarded, 10) : 10,
      isPublished: isPublished === 'true' || isPublished === true,
      uploadedBy: userId,
      tags: [EXPLORE_VIDEO_MEDIA_TAG],
    });
  }

  let coverImagePath = null;
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const { url: coverUrl } = await s3Service.uploadFileFromMulter(coverImage, 'media/images');
    coverImagePath = coverUrl;
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

  // Create ExploreContent record
  const exploreContent = await ExploreContent.create({
    title: title.trim(),
    description: description?.trim() || null,
    type: type,
    contentRef: videoMedia ? videoMedia._id : null,
    contentRefModel: 'Media',
    coverImage: coverImagePath, // Cover photo for all video types
    videoType: type === 'video' ? videoType : null,
    videoFile: videoMedia ? videoMedia._id : null,
    videoFilePath: videoFilePath,
    videoFileUrl: videoFileUrl,
    duration: duration ? parseInt(duration, 10) : null,
    category: category?.trim() || null,
    starsAwarded: starsAwarded ? parseInt(starsAwarded, 10) : 10,
    totalItems: totalItems ? parseInt(totalItems, 10) : 0,
    order: order ? parseInt(order, 10) : 0,
    isFeatured: isFeatured === 'true' || isFeatured === true,
    isPublished: isPublished === 'true' || isPublished === true,
    createdBy: userId,
    tags: parsedTags.filter(t => t && t.trim()).map(t => t.trim()),
  });

  // Get created content with populated data
  const createdContent = await ExploreContent.findById(exploreContent._id)
    .populate('videoFile', VIDEO_FILE_POPULATE_SELECT)
    .populate('contentRef')
    .populate('createdBy', 'name email')
    .lean();

  return createdContent;
  } finally {
    await Promise.all(
      tempDiskPaths.map((p) =>
        fs.promises.unlink(p).catch(() => {})
      )
    );
  }
};

/**
 * Get All Explore Content Service
 * 
 * Retrieves all explore content with optional filtering and pagination
 * 
 * @param {Object} queryParams - Query parameters
 * @returns {Object} Explore content with pagination info
 */
const getAllExploreContent = async (queryParams = {}) => {
  const {
    user,
    type,
    videoType,
    category,
    isPublished,
    isFeatured,
    search,
    sortBy = 'createdAt_desc', // Default: Created At (descending), then Order (ascending)
    page = 1,
    limit = 10,
  } = queryParams;

  // Build query
  const query = applyCreatorOwnershipFilter(user, {});

  if (type) {
    query.type = type;
  }

  if (videoType) {
    query.videoType = videoType;
  }

  if (category) {
    query.category = { $regex: category, $options: 'i' };
  }

  if (isPublished !== undefined) {
    query.isPublished = isPublished === 'true' || isPublished === true;
  }

  if (isFeatured !== undefined) {
    query.isFeatured = isFeatured === 'true' || isFeatured === true;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Build sort object based on sortBy parameter
  let sortObject = { order: 1, createdAt: -1 }; // Default sort
  if (sortBy === 'createdAt_desc') {
    // Sort by Created At (descending), then Order (ascending) as fallback
    sortObject = { createdAt: -1, order: 1 };
  } else if (sortBy === 'order_asc') {
    // Sort by Order (ascending), then Created At (descending) as fallback
    sortObject = { order: 1, createdAt: -1 };
  }

  // Get explore content
  const exploreContent = await ExploreContent.find(query)
    .populate('videoFile', VIDEO_FILE_POPULATE_SELECT)
    .populate('contentRef')
    .populate('createdBy', 'name email')
    .sort(sortObject)
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const total = await ExploreContent.countDocuments(query);

  return {
    exploreContent,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get Explore Content By ID Service
 * 
 * Retrieves a single explore content by ID
 * 
 * @param {String} contentId - Explore content's MongoDB ID
 * @returns {Object} Explore content with populated data
 * @throws {Error} If content not found
 */
const getExploreContentById = async (contentId, user = null) => {
  const content = await ExploreContent.findById(contentId)
    .populate('videoFile', VIDEO_FILE_POPULATE_SELECT)
    .populate('contentRef')
    .populate('createdBy', 'name email')
    .lean();

  if (!content) {
    throw new Error('Explore content not found');
  }

  assertCreatorOwnsDocument(user, content);

  return content;
};

/**
 * Update Explore Content Service
 * 
 * Updates explore content fields: title, description, cover photo, optional embedUrl (Bunny embed only), etc.
 * Uploaded video file cannot be swapped after creation.
 * 
 * @param {String} contentId - Explore content's MongoDB ID
 * @param {String} userId - Admin user's MongoDB ID (for verification)
 * @param {Object} updateData - Data to update
 * @param {Object} files - Uploaded files (coverImage only)
 * @returns {Object} Updated explore content with populated data
 * @throws {Error} If content not found or validation fails
 */
const updateExploreContent = async (contentId, userId, updateData, files = {}, user = null) => {
  const tempDiskPaths = collectMulterDiskPaths(files);

  try {
  const {
    title,
    description,
    videoType,
    videoSource: videoSourceRaw,
    embedUrl,
    category,
    starsAwarded,
    totalItems,
    order,
    isFeatured,
    isPublished,
    tags,
    duration,
  } = updateData;

  const hasVideoFile =
    files.videoFile && Array.isArray(files.videoFile) && files.videoFile.length > 0;
  const requestedVideoSource =
    typeof videoSourceRaw === 'string' && videoSourceRaw.trim().toLowerCase() === 'embed'
      ? 'embed'
      : typeof videoSourceRaw === 'string' && videoSourceRaw.trim().toLowerCase() === 'upload'
        ? 'upload'
        : null;

  // Find content
  const content = await ExploreContent.findById(contentId);

  if (!content) {
    throw new Error('Explore content not found');
  }

  assertCreatorOwnsDocument(user, content);

  if (hasVideoFile && requestedVideoSource === 'embed') {
    throw new Error('Do not attach a video file when using videoSource embed');
  }

  // Update title
  if (title !== undefined) {
    if (!title || !title.trim()) {
      throw new Error('Title cannot be empty');
    }
    content.title = title.trim();
  }

  // Update description
  if (description !== undefined) {
    content.description = description?.trim() || null;
  }

  // Update video type (only for video content)
  if (videoType !== undefined && content.type === 'video') {
    const validVideoTypes = ['replay', 'arts_crafts', 'cooking', 'music', 'movement_fitness', 'story_time', 'manners_etiquette'];
    if (!validVideoTypes.includes(videoType)) {
      throw new Error(`Invalid videoType. Must be one of: ${validVideoTypes.join(', ')}`);
    }
    content.videoType = videoType;
  }

  // Update category
  if (category !== undefined) {
    content.category = category?.trim() || null;
  }

  // Update stars awarded
  if (starsAwarded !== undefined) {
    const stars = parseInt(starsAwarded, 10);
    if (isNaN(stars) || stars < 0) {
      throw new Error('Stars awarded must be a non-negative number');
    }
    content.starsAwarded = stars;
  }

  // Update total items
  if (totalItems !== undefined) {
    content.totalItems = parseInt(totalItems, 10) || 0;
  }

  // Update order
  if (order !== undefined) {
    content.order = parseInt(order, 10) || 0;
  }

  // Update duration
  if (duration !== undefined) {
    content.duration = duration ? parseInt(duration, 10) : null;
  }

  // Update featured status
  if (isFeatured !== undefined) {
    content.isFeatured = isFeatured === 'true' || isFeatured === true;
  }

  // Update published status
  if (isPublished !== undefined) {
    content.isPublished = isPublished === 'true' || isPublished === true;
  }

  // Update tags
  if (tags !== undefined) {
    let parsedTags = [];
    try {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      if (!Array.isArray(parsedTags)) {
        parsedTags = [];
      }
    } catch (error) {
      parsedTags = [];
    }
    content.tags = parsedTags.filter(t => t && t.trim()).map(t => t.trim());
  }

  if (embedUrl !== undefined || requestedVideoSource === 'embed') {
    if (!content.videoFile) {
      throw new Error('Cannot update embedUrl: linked video media is missing');
    }
    const mediaRecord = await Media.findById(content.videoFile);
    if (!mediaRecord) {
      throw new Error('Linked media not found');
    }

    const currentSource = mediaRecord.videoSource || 'upload';
    const targetSource = requestedVideoSource || currentSource;

    if (targetSource === 'embed') {
      const canonical = assertBunnyIframeEmbedUrl(
        typeof embedUrl === 'string' ? embedUrl : String(embedUrl ?? mediaRecord.embedUrl ?? '')
      );

      if (currentSource === 'upload' && mediaRecord.filePath) {
        try {
          await s3Service.deleteByKey(mediaRecord.filePath);
        } catch (error) {
          console.error('Error deleting previous explore video:', error);
        }
      }

      mediaRecord.videoSource = 'embed';
      mediaRecord.embedUrl = canonical;
      mediaRecord.cloudUrl = canonical;
      mediaRecord.url = canonical;
      mediaRecord.filePath = null;
      mediaRecord.mimeType = null;
      mediaRecord.size = null;
      await mediaRecord.save();
      content.videoFileUrl = canonical;
      content.videoFilePath = null;
    } else if (embedUrl !== undefined) {
      throw new Error('embedUrl can only be updated for Bunny embed videos');
    }
  }

  if (hasVideoFile && content.type === 'video') {
    let mediaRecord = content.videoFile ? await Media.findById(content.videoFile) : null;

    if (mediaRecord && (mediaRecord.videoSource || 'upload') === 'upload' && mediaRecord.filePath) {
      try {
        await s3Service.deleteByKey(mediaRecord.filePath);
      } catch (error) {
        console.error('Error deleting previous explore video:', error);
      }
    } else if (content.videoFilePath) {
      try {
        await s3Service.deleteByKey(content.videoFilePath);
      } catch (error) {
        console.error('Error deleting previous explore video path:', error);
      }
    }

    const videoFile = files.videoFile[0];
    let videoByteSize = typeof videoFile.size === 'number' ? videoFile.size : 0;
    if ((!videoByteSize || videoByteSize < 0) && videoFile.path) {
      try {
        const st = await fs.promises.stat(videoFile.path);
        videoByteSize = st.size;
      } catch (_) {
        videoByteSize = 0;
      }
    }

    const { url: videoUrl, s3Key: videoS3Key } = await s3Service.uploadFileFromMulter(videoFile, 'media/videos');

    if (mediaRecord) {
      mediaRecord.videoSource = 'upload';
      mediaRecord.title = content.title?.trim() || videoFile.originalname;
      mediaRecord.filePath = videoS3Key;
      mediaRecord.url = videoUrl;
      mediaRecord.cloudUrl = videoUrl;
      mediaRecord.mimeType = videoFile.mimetype;
      mediaRecord.size = videoByteSize;
      mediaRecord.embedUrl = null;
      if (duration !== undefined) {
        mediaRecord.duration = duration ? parseInt(duration, 10) : null;
      }
      await mediaRecord.save();
    } else {
      mediaRecord = await Media.create({
        type: 'video',
        videoSource: 'upload',
        title: content.title?.trim() || videoFile.originalname,
        description: content.description?.trim() || null,
        filePath: videoS3Key,
        url: videoUrl,
        mimeType: videoFile.mimetype,
        size: videoByteSize,
        duration: duration ? parseInt(duration, 10) : content.duration,
        uploadedBy: userId,
        tags: [EXPLORE_VIDEO_MEDIA_TAG],
      });
      content.videoFile = mediaRecord._id;
      content.contentRef = mediaRecord._id;
      content.contentRefModel = 'Media';
    }

    content.videoFilePath = videoS3Key;
    content.videoFileUrl = videoUrl;
  } else if (requestedVideoSource === 'upload' && content.type === 'video') {
    const mediaRecord = content.videoFile ? await Media.findById(content.videoFile) : null;
    if ((mediaRecord?.videoSource || 'upload') === 'embed') {
      throw new Error('Please provide a video file when switching to upload source');
    }
  }

  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    if (content.coverImage) {
      try {
        const oldKey = s3Service.getS3KeyFromUrl(content.coverImage);
        if (oldKey) await s3Service.deleteByKey(oldKey);
      } catch (error) {
        console.error('Error deleting old cover image:', error);
      }
    }
    const coverImage = files.coverImage[0];
    const { url: coverUrl } = await s3Service.uploadFileFromMulter(coverImage, 'media/images');
    content.coverImage = coverUrl;
  }

  await content.save();

  // Get updated content with populated data
  const updatedContent = await ExploreContent.findById(contentId)
    .populate('videoFile', VIDEO_FILE_POPULATE_SELECT)
    .populate('contentRef')
    .populate('createdBy', 'name email')
    .lean();

  return updatedContent;
  } finally {
    await Promise.all(
      tempDiskPaths.map((p) =>
        fs.promises.unlink(p).catch(() => {})
      )
    );
  }
};

/**
 * Delete Explore Content Service
 * 
 * Deletes explore content (hard delete - removes from database)
 * Also deletes associated video file and Media record
 * 
 * @param {String} contentId - Explore content's MongoDB ID
 * @returns {Object} Deleted content info
 * @throws {Error} If content not found
 */
const deleteExploreContent = async (contentId, user = null) => {
  const content = await ExploreContent.findById(contentId);

  if (!content) {
    throw new Error('Explore content not found');
  }

  assertCreatorOwnsDocument(user, content);

  if (content.videoFilePath) {
    try {
      await s3Service.deleteByKey(content.videoFilePath);
    } catch (error) {
      console.error('Error deleting video file from S3:', error);
    }
  }

  if (content.videoFile) {
    try {
      const mediaRecord = await Media.findById(content.videoFile);
      if (mediaRecord && (mediaRecord.videoSource || 'upload') !== 'embed' && mediaRecord.filePath) {
        await s3Service.deleteByKey(mediaRecord.filePath);
      }
      await Media.findByIdAndDelete(content.videoFile);
    } catch (error) {
      console.error('Error deleting media record:', error);
    }
  }

  if (content.coverImage) {
    try {
      const coverKey = s3Service.getS3KeyFromUrl(content.coverImage);
      if (coverKey) await s3Service.deleteByKey(coverKey);
    } catch (error) {
      console.error('Error deleting cover image:', error);
    }
  }


  await ExploreContent.findByIdAndDelete(contentId);

  return { message: 'Explore content deleted successfully', id: contentId };
};

/**
 * Get Explore Content By Type Service
 * 
 * Retrieves explore content filtered by type (video, lesson, etc.) and optionally by videoType
 * Used for public-facing explore page
 * 
 * @param {String} type - Content type (video, lesson, activity, etc.)
 * @param {String} videoType - Video subtype (replay, activity) - only for video type
 * @param {Object} queryParams - Additional query parameters
 * @returns {Object} Explore content with pagination info
 */
const getExploreContentByType = async (type, videoType = null, queryParams = {}) => {
  const {
    category,
    isFeatured,
    page = 1,
    limit = 10,
  } = queryParams;

  // Build query - only published content
  const query = {
    type: type,
    isPublished: true,
  };

  if (videoType && type === 'video') {
    query.videoType = videoType;
  }

  if (category) {
    query.category = { $regex: category, $options: 'i' };
  }

  if (isFeatured !== undefined) {
    query.isFeatured = isFeatured === 'true' || isFeatured === true;
  }

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Get explore content
  const exploreContent = await ExploreContent.find(query)
    .populate('videoFile', VIDEO_FILE_POPULATE_SELECT)
    .populate('contentRef')
    .select('-createdBy') // Don't expose creator for public endpoint
    .sort({ order: 1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const total = await ExploreContent.countDocuments(query);

  return {
    exploreContent,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get Featured Explore Content Service
 * 
 * Retrieves featured explore content for the explore page
 * 
 * @param {Number} limit - Maximum number of items to return
 * @returns {Array} Featured explore content
 */
const getFeaturedExploreContent = async (limit = 10) => {
  const content = await ExploreContent.find({
    isPublished: true,
    isFeatured: true,
  })
    .populate('videoFile', VIDEO_FILE_POPULATE_SELECT)
    .populate('contentRef')
    .select('-createdBy')
    .sort({ order: 1, createdAt: -1 })
    .limit(parseInt(limit, 10))
    .lean();

  return content;
};

/**
 * Reorder Explore Content Service
 * 
 * Reorders Explore content items by updating their order values within a specific video type
 * Order values are scoped per videoType - each video type has independent ordering (0, 1, 2, ...)
 * 
 * @param {Array} contentIds - Array of Explore content IDs in the desired order (all must be same videoType)
 * @param {String} videoType - The video type to reorder (REQUIRED) - e.g., 'replay', 'arts_crafts', 'cooking', etc.
 * @returns {Object} Result with updated count
 * @throws {Error} If validation fails, IDs not found, or mixed video types
 */
const reorderExploreContent = async (contentIds, videoType) => {
  // Validate input
  if (!Array.isArray(contentIds) || contentIds.length === 0) {
    throw new Error('contentIds must be a non-empty array');
  }

  // Check for duplicates
  const uniqueIds = [...new Set(contentIds)];
  if (uniqueIds.length !== contentIds.length) {
    throw new Error('contentIds array contains duplicate IDs');
  }

  // Validate videoType
  const validVideoTypes = ['replay', 'arts_crafts', 'cooking', 'music', 'movement_fitness', 'story_time', 'manners_etiquette'];
  if (!videoType || typeof videoType !== 'string') {
    throw new Error('videoType is required and must be a string');
  }
  if (!validVideoTypes.includes(videoType)) {
    throw new Error(`Invalid videoType. Must be one of: ${validVideoTypes.join(', ')}`);
  }

  // Fetch all ExploreContent documents by IDs
  const contents = await ExploreContent.find({
    _id: { $in: contentIds },
  });

  // Verify all IDs exist
  if (contents.length !== contentIds.length) {
    const foundIds = contents.map(c => c._id.toString());
    const missingIds = contentIds.filter(id => !foundIds.includes(id.toString()));
    throw new Error(`One or more content IDs not found: ${missingIds.join(', ')}`);
  }

  // CRITICAL: Validate that ALL content items belong to the same videoType
  const mixedTypes = contents.filter(c => c.videoType !== videoType);
  if (mixedTypes.length > 0) {
    const mixedTypeIds = mixedTypes.map(c => c._id.toString());
    throw new Error(`All content items must belong to the same videoType. Items with different videoType: ${mixedTypeIds.join(', ')}`);
  }

  // Prepare bulk write operations
  const bulkOps = contentIds.map((contentId, index) => ({
    updateOne: {
      filter: { _id: contentId },
      update: { $set: { order: index } },
    },
  }));

  // Execute bulk write
  const result = await ExploreContent.bulkWrite(bulkOps);

  return {
    updatedCount: result.modifiedCount,
  };
};

module.exports = {
  createExploreContent,
  getAllExploreContent,
  getExploreContentById,
  updateExploreContent,
  deleteExploreContent,
  getExploreContentByType,
  getFeaturedExploreContent,
  reorderExploreContent,
};

