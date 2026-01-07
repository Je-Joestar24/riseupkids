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
  const scormFileUrl = `/uploads${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
  
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
    isArchived,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  // Build query
  const query = {};

  // Note: type filter removed since activities are now SCORM-based only
  // Filter by archived status (default: show only non-archived)
  if (isArchived !== undefined) {
    query.isArchived = isArchived === 'true' || isArchived === true;
  } else {
    query.isArchived = false;
  }

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
  const limitNum = parseInt(limit, 10) || 10;
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

/**
 * Get Activity By ID Service
 * 
 * Retrieves a single activity by ID
 * 
 * @param {String} activityId - Activity's MongoDB ID
 * @returns {Object} Activity with populated data
 * @throws {Error} If activity not found
 */
const getActivityById = async (activityId) => {
  const activity = await Activity.findById(activityId)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  if (!activity) {
    throw new Error('Activity not found');
  }

  return activity;
};

/**
 * Update Activity Service
 * 
 * Updates activity fields: title, description, coverImage, starsAwarded, isPublished
 * SCORM file cannot be changed
 * 
 * @param {String} activityId - Activity's MongoDB ID
 * @param {String} userId - Admin user's MongoDB ID (for verification)
 * @param {Object} updateData - Data to update
 * @param {Array} files - Uploaded files (coverImage only)
 * @returns {Object} Updated activity with populated data
 * @throws {Error} If activity not found or validation fails
 */
const updateActivity = async (activityId, userId, updateData, files = {}) => {
  const {
    title,
    description,
    starsAwarded,
    isPublished,
  } = updateData;

  // Find activity
  const activity = await Activity.findById(activityId);

  if (!activity) {
    throw new Error('Activity not found');
  }

  // Verify user is the creator or admin (you can add role check if needed)
  // For now, we'll allow any admin to edit

  // Update title
  if (title !== undefined) {
    if (!title || !title.trim()) {
      throw new Error('Title cannot be empty');
    }
    activity.title = title.trim();
  }

  // Update description
  if (description !== undefined) {
    activity.description = description?.trim() || null;
  }

  // Update stars awarded
  if (starsAwarded !== undefined) {
    const stars = parseInt(starsAwarded, 10);
    if (isNaN(stars) || stars < 0) {
      throw new Error('Stars awarded must be a non-negative number');
    }
    activity.starsAwarded = stars;
  }

  // Update published status
  if (isPublished !== undefined) {
    activity.isPublished = isPublished === 'true' || isPublished === true;
  }

  // Process cover image if provided
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const coverRelativePath = coverImage.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    const coverImagePath = `/uploads${coverRelativePath.startsWith('/') ? coverRelativePath : `/${coverRelativePath}`}`;
    activity.coverImage = coverImagePath;
  }

  await activity.save();

  // Get updated activity with populated data
  const updatedActivity = await Activity.findById(activityId)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  return updatedActivity;
};

/**
 * Archive Activity Service
 * 
 * Archives (soft deletes) an activity by setting isArchived to true
 * 
 * @param {String} activityId - Activity's MongoDB ID
 * @returns {Object} Archived activity
 * @throws {Error} If activity not found
 */
const archiveActivity = async (activityId) => {
  const activity = await Activity.findById(activityId);

  if (!activity) {
    throw new Error('Activity not found');
  }

  // Archive activity (set isArchived to true and isPublished to false)
  activity.isArchived = true;
  activity.isPublished = false;
  await activity.save();

  // Get archived activity with populated data
  const archivedActivity = await Activity.findById(activityId)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  return archivedActivity;
};

/**
 * Restore Activity Service
 * 
 * Restores (unarchives) an archived activity by setting isArchived to false
 * 
 * @param {String} activityId - Activity's MongoDB ID
 * @returns {Object} Restored activity
 * @throws {Error} If activity not found
 */
const restoreActivity = async (activityId) => {
  const activity = await Activity.findById(activityId);

  if (!activity) {
    throw new Error('Activity not found');
  }

  // Restore activity (set isArchived to false)
  activity.isArchived = false;
  await activity.save();

  // Get restored activity with populated data
  const restoredActivity = await Activity.findById(activityId)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  return restoredActivity;
};

module.exports = {
  createActivity,
  getAllActivities,
  getActivityById,
  updateActivity,
  archiveActivity,
  restoreActivity,
};

