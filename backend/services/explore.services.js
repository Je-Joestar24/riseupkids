const { ExploreContent, Media } = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * Create Explore Content Service
 * 
 * Creates new explore content with video file and optional cover photo (for all video types)
 * 
 * @param {String} userId - Admin user's MongoDB ID
 * @param {Object} contentData - Content data
 * @param {Object} files - Uploaded files (from multer)
 * @returns {Object} Created explore content with populated data
 * @throws {Error} If validation fails
 */
const createExploreContent = async (userId, contentData, files = {}) => {
  const {
    title,
    description,
    type = 'video',
    videoType = 'replay',
    category,
    starsAwarded,
    totalItems,
    order,
    isFeatured,
    isPublished,
    tags,
    duration,
  } = contentData;

  // Validate videoType for new enum values
  const validVideoTypes = ['replay', 'arts_crafts', 'cooking', 'music', 'movement_fitness', 'story_time', 'manners_etiquette'];
  if (type === 'video' && videoType && !validVideoTypes.includes(videoType)) {
    throw new Error(`Invalid videoType. Must be one of: ${validVideoTypes.join(', ')}`);
  }

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error('Please provide a title');
  }

  // For video type, video file is required
  if (type === 'video') {
    if (!files.videoFile || !Array.isArray(files.videoFile) || files.videoFile.length === 0) {
      throw new Error('Please provide a video file');
    }
  }

  // Process video file and create Media record
  let videoMedia = null;
  let videoFilePath = null;
  let videoFileUrl = null;

  if (files.videoFile && Array.isArray(files.videoFile) && files.videoFile.length > 0) {
    const videoFile = files.videoFile[0];
    const videoRelativePath = videoFile.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    videoFileUrl = `/uploads${videoRelativePath.startsWith('/') ? videoRelativePath : `/${videoRelativePath}`}`;
    videoFilePath = videoFile.path;

    // Create Media record for video
    videoMedia = await Media.create({
      type: 'video',
      title: title?.trim() || videoFile.originalname,
      description: description?.trim() || null,
      filePath: videoFile.path,
      url: videoFileUrl,
      mimeType: videoFile.mimetype,
      size: videoFile.size,
      duration: duration ? parseInt(duration, 10) : null,
      starsAwarded: starsAwarded ? parseInt(starsAwarded, 10) : 10,
      isPublished: isPublished === 'true' || isPublished === true,
      uploadedBy: userId,
    });
  }

  // Process cover image if provided
  let coverImagePath = null;
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const coverRelativePath = coverImage.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    coverImagePath = `/uploads${coverRelativePath.startsWith('/') ? coverRelativePath : `/${coverRelativePath}`}`;
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
    .populate('videoFile', 'type title url mimeType size duration')
    .populate('contentRef')
    .populate('createdBy', 'name email')
    .lean();

  return createdContent;
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
    type,
    videoType,
    category,
    isPublished,
    isFeatured,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  // Build query
  const query = {};

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

  // Get explore content
  const exploreContent = await ExploreContent.find(query)
    .populate('videoFile', 'type title url mimeType size duration thumbnail')
    .populate('contentRef')
    .populate('createdBy', 'name email')
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
 * Get Explore Content By ID Service
 * 
 * Retrieves a single explore content by ID
 * 
 * @param {String} contentId - Explore content's MongoDB ID
 * @returns {Object} Explore content with populated data
 * @throws {Error} If content not found
 */
const getExploreContentById = async (contentId) => {
  const content = await ExploreContent.findById(contentId)
    .populate('videoFile', 'type title url mimeType size duration thumbnail')
    .populate('contentRef')
    .populate('createdBy', 'name email')
    .lean();

  if (!content) {
    throw new Error('Explore content not found');
  }

  return content;
};

/**
 * Update Explore Content Service
 * 
 * Updates explore content fields: title, description, cover photo, etc.
 * Video file cannot be changed after creation
 * 
 * @param {String} contentId - Explore content's MongoDB ID
 * @param {String} userId - Admin user's MongoDB ID (for verification)
 * @param {Object} updateData - Data to update
 * @param {Object} files - Uploaded files (coverImage only)
 * @returns {Object} Updated explore content with populated data
 * @throws {Error} If content not found or validation fails
 */
const updateExploreContent = async (contentId, userId, updateData, files = {}) => {
  const {
    title,
    description,
    videoType,
    category,
    starsAwarded,
    totalItems,
    order,
    isFeatured,
    isPublished,
    tags,
    duration,
  } = updateData;

  // Find content
  const content = await ExploreContent.findById(contentId);

  if (!content) {
    throw new Error('Explore content not found');
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

  // Process cover image if provided (for all video types)
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    // Delete old cover image if exists
    if (content.coverImage) {
      const oldCoverPath = path.join(__dirname, '../', content.coverImage.replace('/uploads', 'uploads'));
      if (fs.existsSync(oldCoverPath)) {
        try {
          fs.unlinkSync(oldCoverPath);
        } catch (error) {
          console.error('Error deleting old cover image:', error);
        }
      }
    }
    const coverImage = files.coverImage[0];
    const coverRelativePath = coverImage.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    content.coverImage = `/uploads${coverRelativePath.startsWith('/') ? coverRelativePath : `/${coverRelativePath}`}`;
  }

  await content.save();

  // Get updated content with populated data
  const updatedContent = await ExploreContent.findById(contentId)
    .populate('videoFile', 'type title url mimeType size duration thumbnail')
    .populate('contentRef')
    .populate('createdBy', 'name email')
    .lean();

  return updatedContent;
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
const deleteExploreContent = async (contentId) => {
  const content = await ExploreContent.findById(contentId);

  if (!content) {
    throw new Error('Explore content not found');
  }

  // Delete video file if exists
  if (content.videoFilePath && fs.existsSync(content.videoFilePath)) {
    try {
      fs.unlinkSync(content.videoFilePath);
    } catch (error) {
      console.error('Error deleting video file:', error);
    }
  }

  // Delete associated Media record if exists
  if (content.videoFile) {
    try {
      const mediaRecord = await Media.findById(content.videoFile);
      if (mediaRecord && mediaRecord.filePath && fs.existsSync(mediaRecord.filePath)) {
        fs.unlinkSync(mediaRecord.filePath);
      }
      await Media.findByIdAndDelete(content.videoFile);
    } catch (error) {
      console.error('Error deleting media record:', error);
    }
  }

  // Delete cover image if exists
  if (content.coverImage) {
    const coverPath = path.join(__dirname, '../', content.coverImage.replace('/uploads', 'uploads'));
    if (fs.existsSync(coverPath)) {
      try {
        fs.unlinkSync(coverPath);
      } catch (error) {
        console.error('Error deleting cover image:', error);
      }
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
    .populate('videoFile', 'type title url mimeType size duration thumbnail')
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
    .populate('videoFile', 'type title url mimeType size duration thumbnail')
    .populate('contentRef')
    .select('-createdBy')
    .sort({ order: 1, createdAt: -1 })
    .limit(parseInt(limit, 10))
    .lean();

  return content;
};

module.exports = {
  createExploreContent,
  getAllExploreContent,
  getExploreContentById,
  updateExploreContent,
  deleteExploreContent,
  getExploreContentByType,
  getFeaturedExploreContent,
};

