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
    instructions,
    type,
    questions,
    autoComplete,
    maxScore,
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

  if (!instructions || !instructions.trim()) {
    throw new Error('Please provide activity instructions');
  }

  if (!type) {
    throw new Error('Please provide activity type');
  }

  // Validate activity type
  const validTypes = ['drawing', 'quiz', 'task', 'puzzle', 'matching', 'writing', 'other'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid activity type. Allowed types: ${validTypes.join(', ')}`);
  }

  // Validate questions for quiz type
  let parsedQuestions = [];
  if (type === 'quiz') {
    if (questions) {
      try {
        parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;
        
        if (!Array.isArray(parsedQuestions)) {
          throw new Error('Questions must be an array');
        }

        // Validate each question
        parsedQuestions.forEach((q, index) => {
          if (!q.question || !q.question.trim()) {
            throw new Error(`Question ${index + 1}: Please provide question text`);
          }
          if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
            throw new Error(`Question ${index + 1}: Please provide at least 2 options`);
          }
          if (q.correctAnswer === undefined || q.correctAnswer === null) {
            throw new Error(`Question ${index + 1}: Please provide correct answer index`);
          }
          if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
            throw new Error(`Question ${index + 1}: Correct answer index is out of range`);
          }
        });
      } catch (error) {
        if (error.message.includes('JSON')) {
          throw new Error('Invalid questions format. Must be valid JSON array');
        }
        throw error;
      }
    } else {
      throw new Error('Quiz activities require questions');
    }
  }

  // Validate badge if provided
  if (badgeAwarded) {
    const badge = await Badge.findById(badgeAwarded);
    if (!badge) {
      throw new Error('Invalid badge ID');
    }
  }

  // Process uploaded files and create Media records
  const mediaIds = [];
  
  // Process images
  if (files.images && Array.isArray(files.images)) {
    for (const file of files.images) {
      // Generate relative URL from uploads directory
      const relativePath = file.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
      const media = await Media.create({
        type: 'image',
        title: file.originalname,
        filePath: file.path,
        url: relativePath.startsWith('/') ? relativePath : `/${relativePath}`,
        mimeType: file.mimetype,
        size: file.size,
        width: null, // Can be extracted with image processing library if needed
        height: null,
        uploadedBy: userId,
      });
      mediaIds.push(media._id);
    }
  }

  // Process videos
  if (files.videos && Array.isArray(files.videos)) {
    for (const file of files.videos) {
      // Generate relative URL from uploads directory
      const relativePath = file.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
      const media = await Media.create({
        type: 'video',
        title: file.originalname,
        filePath: file.path,
        url: relativePath.startsWith('/') ? relativePath : `/${relativePath}`,
        mimeType: file.mimetype,
        size: file.size,
        duration: null, // Can be extracted with video processing library if needed
        uploadedBy: userId,
      });
      mediaIds.push(media._id);
    }
  }

  // Process audio
  if (files.audio && Array.isArray(files.audio)) {
    for (const file of files.audio) {
      // Generate relative URL from uploads directory
      const relativePath = file.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
      const media = await Media.create({
        type: 'audio',
        title: file.originalname,
        filePath: file.path,
        url: relativePath.startsWith('/') ? relativePath : `/${relativePath}`,
        mimeType: file.mimetype,
        size: file.size,
        duration: null, // Can be extracted with audio processing library if needed
        uploadedBy: userId,
      });
      mediaIds.push(media._id);
    }
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
    instructions: instructions.trim(),
    type,
    media: mediaIds,
    questions: parsedQuestions,
    autoComplete: autoComplete === 'true' || autoComplete === true,
    maxScore: maxScore ? parseInt(maxScore, 10) : null,
    estimatedTime: estimatedTime ? parseInt(estimatedTime, 10) : null,
    starsAwarded: starsAwarded ? parseInt(starsAwarded, 10) : 15,
    badgeAwarded: badgeAwarded || null,
    tags: parsedTags.filter(t => t && t.trim()).map(t => t.trim()),
    isPublished: isPublished === 'true' || isPublished === true,
    createdBy: userId,
  });

  // Get created activity with populated media
  const createdActivity = await Activity.findById(activity._id)
    .populate({
      path: 'media',
      select: 'type title url mimeType size duration width height',
    })
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

  if (type) {
    query.type = type;
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
  const limitNum = parseInt(limit, 10) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Get activities
  const activities = await Activity.find(query)
    .populate({
      path: 'media',
      select: 'type title url mimeType size',
    })
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

