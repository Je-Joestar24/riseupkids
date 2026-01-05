const { Activity, Media, Badge } = require('../models');
const fs = require('fs');
const path = require('path');

/**
 * Create Activity Service
 * 
 * Creates a new activity with optional media files
 * 
 * @param {String} userId - Admin user's MongoDB ID
 * @param {Object} activityData - Activity data
 * @param {Array} files - Uploaded files (from multer)
 * @returns {Object} Created activity with populated media
 * @throws {Error} If validation fails
 */
const createActivity = async (userId, activityData, files = {}) => {
  const {
    title,
    description,
    estimatedTime,
    starsAwarded,
    badgeAwarded,
    tags,
    isPublished,
  } = activityData;

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error('Please provide an activity title');
  }

  // Validate SCORM file is provided
  if (!files.scormFile || !Array.isArray(files.scormFile) || files.scormFile.length === 0) {
    throw new Error('Please provide a SCORM file (ZIP format)');
  }

  const scormFile = files.scormFile[0];

  // Validate badge if provided
  if (badgeAwarded) {
    const badge = await Badge.findById(badgeAwarded);
    if (!badge) {
      throw new Error('Invalid badge ID');
    }
  }

  // Process SCORM file and create Media record
  const relativePath = scormFile.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
  const scormFileUrl = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  
  const scormMedia = await Media.create({
    type: 'video', // Using 'video' type for SCORM files (or we could add 'scorm' type)
    title: scormFile.originalname,
    filePath: scormFile.path,
    url: scormFileUrl,
    mimeType: scormFile.mimetype,
    size: scormFile.size,
    uploadedBy: userId,
  });

  // Process cover image if provided
  let coverImagePath = null;
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const coverRelativePath = coverImage.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    coverImagePath = coverRelativePath.startsWith('/') ? coverRelativePath : `/${coverRelativePath}`;
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

  // Create activity
  const activity = await Activity.create({
    title: title.trim(),
    description: description?.trim() || null,
    coverImage: coverImagePath,
    scormFile: scormMedia._id,
    scormFilePath: scormFile.path,
    scormFileUrl: scormFileUrl,
    scormFileSize: scormFile.size,
    estimatedTime: estimatedTime ? parseInt(estimatedTime, 10) : null,
    starsAwarded: starsAwarded ? parseInt(starsAwarded, 10) : 15,
    badgeAwarded: badgeAwarded || null,
    tags: parsedTags.filter(t => t && t.trim()).map(t => t.trim()),
    isPublished: isPublished === 'true' || isPublished === true,
    createdBy: userId,
  });

  // Get created activity with populated data
  const createdActivity = await Activity.findById(activity._id)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  return createdActivity;
};

/**
 * Get All Activities Service
 * 
 * Retrieves all activities with optional filtering and pagination
 * 
 * @param {Object} queryParams - Query parameters
 * @param {String} [queryParams.type] - Filter by activity type
 * @param {Boolean} [queryParams.isPublished] - Filter by published status
 * @param {String} [queryParams.search] - Search in title/description
 * @param {Number} [queryParams.page] - Page number (default: 1)
 * @param {Number} [queryParams.limit] - Items per page (default: 20)
 * @returns {Object} Activities with pagination info
 */
const getAllActivities = async (queryParams = {}) => {
  const {
    type,
    isPublished,
    search,
    page = 1,
    limit = 20,
  } = queryParams;

  // Build query
  const query = {};

  // Note: type filter removed since activities are now SCORM-based only

  if (isPublished !== undefined) {
    query.isPublished = isPublished === 'true' || isPublished === true;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Get activities
  const activities = await Activity.find(query)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const total = await Activity.countDocuments(query);

  return {
    activities,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

module.exports = {
  createActivity,
  getAllActivities,
};

