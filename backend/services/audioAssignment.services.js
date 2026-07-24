const { AudioAssignment, Media, Badge } = require('../models');
const path = require('path');
const s3Service = require('./s3.service');
const { applyCreatorSharedReadFilter, assertCreatorOwnsDocument, assertCreatorCanReadDocument } = require('../utils/contentOwnership');
const {
  INSTRUCTION_VIDEO_POPULATE_SELECT,
  resolveInstructionVideoMedia,
  deleteInstructionVideoMedia,
} = require('../utils/instructionVideoMedia.util');

/**
 * Create Audio Assignment Service
 * 
 * Creates a new audio assignment with reference audio and cover image
 * Audio assignments require admin review/approval
 * 
 * @param {String} userId - Admin user's MongoDB ID
 * @param {Object} assignmentData - Audio assignment data
 * @param {Array} files - Uploaded files (from multer)
 * @returns {Object} Created audio assignment with populated media
 * @throws {Error} If validation fails
 */
const createAudioAssignment = async (userId, assignmentData, files = {}) => {
  const {
    title,
    description,
    instructions,
    estimatedDuration,
    starsAwarded,
    isStarAssignment,
    badgeAwarded,
    tags,
    isPublished,
  } = assignmentData;

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error('Please provide an assignment title');
  }

  if (!instructions || !instructions.trim()) {
    throw new Error('Please provide assignment instructions');
  }

  // Validate badge if provided
  if (badgeAwarded) {
    const badge = await Badge.findById(badgeAwarded);
    if (!badge) {
      throw new Error('Invalid badge ID');
    }
  }

  let referenceAudioId = null;
  if (files.referenceAudio && Array.isArray(files.referenceAudio) && files.referenceAudio.length > 0) {
    const referenceAudio = files.referenceAudio[0];
    const { url: audioFileUrl, s3Key: audioS3Key } = await s3Service.uploadFileFromMulter(referenceAudio, 'media/audio');
    const audioMedia = await Media.create({
      type: 'audio',
      title: referenceAudio.originalname,
      filePath: audioS3Key,
      url: audioFileUrl,
      mimeType: referenceAudio.mimetype,
      size: referenceAudio.size,
      uploadedBy: userId,
    });
    referenceAudioId = audioMedia._id;
  }

  let instructionVideoId = null;
  const instructionVideoMedia = await resolveInstructionVideoMedia({
    userId,
    files,
    payload: assignmentData,
    titleFallback: `${title?.trim() || 'Audio assignment'} instruction video`,
  });
  if (instructionVideoMedia) {
    instructionVideoId = instructionVideoMedia._id;
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

  // Create audio assignment
  const audioAssignment = await AudioAssignment.create({
    title: title.trim(),
    description: description?.trim() || null,
    instructions: instructions.trim(),
    referenceAudio: referenceAudioId,
    instructionVideo: instructionVideoId,
    coverImage: coverImagePath,
    estimatedDuration: estimatedDuration ? parseInt(estimatedDuration, 10) : null,
    starsAwarded: starsAwarded ? parseInt(starsAwarded, 10) : 10,
    isStarAssignment: isStarAssignment === 'true' || isStarAssignment === true,
    badgeAwarded: badgeAwarded || null,
    tags: parsedTags.filter(t => t && t.trim()).map(t => t.trim()),
    isPublished: isPublished === 'true' || isPublished === true,
    createdBy: userId,
  });

  // Get created audio assignment with populated data
  const createdAssignment = await AudioAssignment.findById(audioAssignment._id)
    .populate('referenceAudio', 'type title url mimeType size duration')
    .populate('instructionVideo', INSTRUCTION_VIDEO_POPULATE_SELECT)
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  return createdAssignment;
};

/**
 * Get All Audio Assignments Service
 * 
 * Retrieves all audio assignments with optional filtering and pagination
 * 
 * @param {Object} queryParams - Query parameters
 * @param {Boolean} [queryParams.isPublished] - Filter by published status
 * @param {Boolean} [queryParams.isStarAssignment] - Filter by star assignment status
 * @param {String} [queryParams.search] - Search in title/description/instructions
 * @param {Number} [queryParams.page] - Page number (default: 1)
 * @param {Number} [queryParams.limit] - Items per page (default: 10)
 * @returns {Object} Audio assignments with pagination info
 */
const getAllAudioAssignments = async (queryParams = {}) => {
  const {
    user,
    isPublished,
    isStarAssignment,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  // Build query — creators see own + other creators' published audio assignments
  let query = {};

  if (isPublished !== undefined) {
    query.isPublished = isPublished === 'true' || isPublished === true;
  }

  if (isStarAssignment !== undefined) {
    query.isStarAssignment = isStarAssignment === 'true' || isStarAssignment === true;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { instructions: { $regex: search, $options: 'i' } },
    ];
  }

  query = applyCreatorSharedReadFilter(user, query, {
    publishedField: 'isPublished',
    publishedValue: true,
  });

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Get audio assignments
  const audioAssignments = await AudioAssignment.find(query)
    .populate('referenceAudio', 'type title url mimeType size duration')
    .populate('instructionVideo', INSTRUCTION_VIDEO_POPULATE_SELECT)
    .populate('badgeAwarded', 'name description icon image')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const total = await AudioAssignment.countDocuments(query);

  return {
    audioAssignments,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get Audio Assignment By ID Service
 * 
 * Retrieves a single audio assignment by ID
 * 
 * @param {String} assignmentId - Audio assignment's MongoDB ID
 * @returns {Object} Audio assignment with populated data
 * @throws {Error} If audio assignment not found
 */
const getAudioAssignmentById = async (assignmentId, user = null) => {
  const audioAssignment = await AudioAssignment.findById(assignmentId)
    .populate('referenceAudio', 'type title url mimeType size duration')
    .populate('instructionVideo', INSTRUCTION_VIDEO_POPULATE_SELECT)
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  if (!audioAssignment) {
    throw new Error('Audio assignment not found');
  }

  assertCreatorCanReadDocument(user, audioAssignment, {
    publishedField: 'isPublished',
    publishedValue: true,
  });

  return audioAssignment;
};

/**
 * Update Audio Assignment Service
 * 
 * Updates audio assignment fields: title, description, instructions, coverImage,
 * estimatedDuration, starsAwarded, isStarAssignment, isPublished
 * Reference audio cannot be changed
 * 
 * @param {String} assignmentId - Audio assignment's MongoDB ID
 * @param {String} userId - Admin user's MongoDB ID (for verification)
 * @param {Object} updateData - Data to update
 * @param {Array} files - Uploaded files (coverImage only)
 * @returns {Object} Updated audio assignment with populated data
 * @throws {Error} If audio assignment not found or validation fails
 */
const updateAudioAssignment = async (assignmentId, userId, updateData, files = {}, user = null) => {
  const {
    title,
    description,
    instructions,
    estimatedDuration,
    starsAwarded,
    isStarAssignment,
    isPublished,
  } = updateData;

  // Find audio assignment
  const audioAssignment = await AudioAssignment.findById(assignmentId);

  if (!audioAssignment) {
    throw new Error('Audio assignment not found');
  }

  assertCreatorOwnsDocument(user, audioAssignment);

  // Update title
  if (title !== undefined) {
    if (!title || !title.trim()) {
      throw new Error('Title cannot be empty');
    }
    audioAssignment.title = title.trim();
  }

  // Update description
  if (description !== undefined) {
    audioAssignment.description = description?.trim() || null;
  }

  // Update instructions
  if (instructions !== undefined) {
    if (!instructions || !instructions.trim()) {
      throw new Error('Instructions cannot be empty');
    }
    audioAssignment.instructions = instructions.trim();
  }

  // Update estimated duration
  if (estimatedDuration !== undefined) {
    audioAssignment.estimatedDuration = estimatedDuration ? parseInt(estimatedDuration, 10) : null;
  }

  // Update stars awarded
  if (starsAwarded !== undefined) {
    const stars = parseInt(starsAwarded, 10);
    if (isNaN(stars) || stars < 0) {
      throw new Error('Stars awarded must be a non-negative number');
    }
    audioAssignment.starsAwarded = stars;
  }

  // Update star assignment flag
  if (isStarAssignment !== undefined) {
    audioAssignment.isStarAssignment = isStarAssignment === 'true' || isStarAssignment === true;
  }

  // Update published status
  if (isPublished !== undefined) {
    audioAssignment.isPublished = isPublished === 'true' || isPublished === true;
  }

  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const { url: coverUrl } = await s3Service.uploadFileFromMulter(coverImage, 'media/images');
    audioAssignment.coverImage = coverUrl;
  }

  if (files.referenceAudio && Array.isArray(files.referenceAudio) && files.referenceAudio.length > 0) {
    const referenceAudio = files.referenceAudio[0];

    if (audioAssignment.referenceAudio) {
      try {
        const oldAudioMedia = await Media.findById(audioAssignment.referenceAudio);
        if (oldAudioMedia && oldAudioMedia.filePath) {
          await s3Service.deleteByKey(oldAudioMedia.filePath);
        }
        await Media.findByIdAndDelete(audioAssignment.referenceAudio);
      } catch (error) {
        console.error('Error deleting previous reference audio:', error);
      }
    }

    const { url: audioFileUrl, s3Key: audioS3Key } = await s3Service.uploadFileFromMulter(referenceAudio, 'media/audio');
    const audioMedia = await Media.create({
      type: 'audio',
      title: referenceAudio.originalname,
      filePath: audioS3Key,
      url: audioFileUrl,
      mimeType: referenceAudio.mimetype,
      size: referenceAudio.size,
      uploadedBy: userId,
    });
    audioAssignment.referenceAudio = audioMedia._id;
  }

  const instructionVideoMedia = await resolveInstructionVideoMedia({
    userId,
    files,
    payload: updateData,
    titleFallback: `${audioAssignment.title || 'Audio assignment'} instruction video`,
    existingMediaId: audioAssignment.instructionVideo,
  });
  if (instructionVideoMedia) {
    audioAssignment.instructionVideo = instructionVideoMedia._id;
  }

  await audioAssignment.save();

  // Get updated audio assignment with populated data
  const updatedAssignment = await AudioAssignment.findById(assignmentId)
    .populate('referenceAudio', 'type title url mimeType size duration')
    .populate('instructionVideo', INSTRUCTION_VIDEO_POPULATE_SELECT)
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  return updatedAssignment;
};

/**
 * Delete Audio Assignment Service
 * 
 * Deletes an audio assignment (hard delete - removes from database)
 * 
 * @param {String} assignmentId - Audio assignment's MongoDB ID
 * @returns {Object} Deleted audio assignment info
 * @throws {Error} If audio assignment not found
 */
const deleteAudioAssignment = async (assignmentId, user = null) => {
  const audioAssignment = await AudioAssignment.findById(assignmentId);

  if (!audioAssignment) {
    throw new Error('Audio assignment not found');
  }

  assertCreatorOwnsDocument(user, audioAssignment);

  if (audioAssignment.referenceAudio) {
    try {
      const audioMedia = await Media.findById(audioAssignment.referenceAudio);
      if (audioMedia && audioMedia.filePath) await s3Service.deleteByKey(audioMedia.filePath);
      await Media.findByIdAndDelete(audioAssignment.referenceAudio);
    } catch (error) {
      console.error('Error deleting reference audio:', error);
    }
  }

  if (audioAssignment.instructionVideo) {
    await deleteInstructionVideoMedia(audioAssignment.instructionVideo);
  }

  if (audioAssignment.coverImage) {
    try {
      const coverKey = s3Service.getS3KeyFromUrl(audioAssignment.coverImage);
      if (coverKey) await s3Service.deleteByKey(coverKey);
    } catch (error) {
      console.error('Error deleting cover image:', error);
    }
  }

  await AudioAssignment.findByIdAndDelete(assignmentId);

  return { message: 'Audio assignment deleted successfully', id: assignmentId };
};

module.exports = {
  createAudioAssignment,
  getAllAudioAssignments,
  getAudioAssignmentById,
  updateAudioAssignment,
  deleteAudioAssignment,
};

