const { Chant, Media, Badge } = require('../models');
const path = require('path');
const s3Service = require('./s3.service');
const scormService = require('./scorm.service');
const { applyCreatorSharedReadFilter, assertCreatorOwnsDocument, assertCreatorCanReadDocument } = require('../utils/contentOwnership');
const {
  INSTRUCTION_VIDEO_POPULATE_SELECT,
  resolveInstructionVideoMedia,
  deleteInstructionVideoMedia,
} = require('../utils/instructionVideoMedia.util');

/**
 * Create Chant Service
 * 
 * Creates a new chant with optional audio, optional SCORM file, and optional cover image
 * 
 * @param {String} userId - Admin user's MongoDB ID
 * @param {Object} chantData - Chant data
 * @param {Array} files - Uploaded files (from multer)
 * @returns {Object} Created chant with populated media
 * @throws {Error} If validation fails
 */
const createChant = async (userId, chantData, files = {}) => {
  const {
    title,
    description,
    instructions,
    estimatedDuration,
    starsAwarded,
    badgeAwarded,
    tags,
    isPublished,
  } = chantData;

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error('Please provide a chant title');
  }

  // Validate badge if provided
  if (badgeAwarded) {
    const badge = await Badge.findById(badgeAwarded);
    if (!badge) {
      throw new Error('Invalid badge ID');
    }
  }

  let audioId = null;
  if (files.audio && Array.isArray(files.audio) && files.audio.length > 0) {
    const audioFile = files.audio[0];
    const { url: audioFileUrl, s3Key: audioS3Key } = await s3Service.uploadFileFromMulter(audioFile, 'media/audio');
    const audioMedia = await Media.create({
      type: 'audio',
      title: audioFile.originalname,
      filePath: audioS3Key,
      url: audioFileUrl,
      mimeType: audioFile.mimetype,
      size: audioFile.size,
      uploadedBy: userId,
    });
    audioId = audioMedia._id;
  }

  let instructionVideoId = null;
  const instructionVideoMedia = await resolveInstructionVideoMedia({
    userId,
    files,
    payload: chantData,
    titleFallback: `${title?.trim() || 'Chant'} instruction video`,
  });
  if (instructionVideoMedia) {
    instructionVideoId = instructionVideoMedia._id;
  }

  let scormFileId = null;
  let scormFilePath = null;
  let scormFileUrl = null;
  let scormFileSize = null;
  let scormFileMimeType = null;
  if (files.scormFile && Array.isArray(files.scormFile) && files.scormFile.length > 0) {
    const scormFile = files.scormFile[0];
    const { url: scormUrl, s3Key: scormS3Key } = await s3Service.uploadFileFromMulter(scormFile, 'activities/scorm');
    scormFileUrl = scormUrl;
    const scormMedia = await Media.create({
      type: 'video',
      title: scormFile.originalname,
      filePath: scormS3Key,
      url: scormFileUrl,
      mimeType: scormFile.mimetype,
      size: scormFile.size,
      uploadedBy: userId,
    });
    scormFileId = scormMedia._id;
    scormFilePath = scormS3Key;
    scormFileSize = scormFile.size;
    scormFileMimeType = scormFile.mimetype;
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

  const chant = await Chant.create({
    title: title.trim(),
    description: description?.trim() || null,
    instructions: instructions?.trim() || null,
    audio: audioId,
    instructionVideo: instructionVideoId,
    scormFile: scormFileId,
    scormFilePath: scormFilePath,
    scormFileUrl: scormFileUrl,
    scormFileSize: scormFileSize,
    scormFileMimeType: scormFileMimeType,
    coverImage: coverImagePath,
    estimatedDuration: estimatedDuration ? parseInt(estimatedDuration, 10) : null,
    starsAwarded: starsAwarded ? parseInt(starsAwarded, 10) : 10,
    badgeAwarded: badgeAwarded || null,
    tags: parsedTags.filter(t => t && t.trim()).map(t => t.trim()),
    isPublished: isPublished === 'true' || isPublished === true,
    createdBy: userId,
  });

  if (files.scormFile && Array.isArray(files.scormFile) && files.scormFile.length > 0) {
    const scormFile = files.scormFile[0];
    if (scormFile.buffer) {
      const extracted = await scormService.uploadExtractedScormToS3(scormFile.buffer, 'chant', chant._id);
      if (extracted) {
        chant.scormBaseUrl = extracted.baseUrl;
        chant.scormEntryPoint = extracted.entryPoint;
        await chant.save();
      }
    }
  }

  const createdChant = await Chant.findById(chant._id)
    .populate('audio', 'type title url mimeType size duration')
    .populate('instructionVideo', INSTRUCTION_VIDEO_POPULATE_SELECT)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  return createdChant;
};

/**
 * Get All Chants Service
 * 
 * Retrieves all chants with optional filtering and pagination
 * 
 * @param {Object} queryParams - Query parameters
 * @param {Boolean} [queryParams.isPublished] - Filter by published status
 * @param {String} [queryParams.search] - Search in title/description/instructions
 * @param {Number} [queryParams.page] - Page number (default: 1)
 * @param {Number} [queryParams.limit] - Items per page (default: 10)
 * @returns {Object} Chants with pagination info
 */
const getAllChants = async (queryParams = {}) => {
  const {
    user,
    isPublished,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  // Build query — creators see own + other creators' published chants
  let query = {};

  if (isPublished !== undefined) {
    query.isPublished = isPublished === 'true' || isPublished === true;
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

  // Get chants
  const chants = await Chant.find(query)
    .populate('audio', 'type title url mimeType size duration')
    .populate('instructionVideo', INSTRUCTION_VIDEO_POPULATE_SELECT)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const total = await Chant.countDocuments(query);

  return {
    chants,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get Chant By ID Service
 * 
 * Retrieves a single chant by ID
 * 
 * @param {String} chantId - Chant's MongoDB ID
 * @returns {Object} Chant with populated data
 * @throws {Error} If chant not found
 */
const getChantById = async (chantId, user = null) => {
  const chant = await Chant.findById(chantId)
    .populate('audio', 'type title url mimeType size duration')
    .populate('instructionVideo', INSTRUCTION_VIDEO_POPULATE_SELECT)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  if (!chant) {
    throw new Error('Chant not found');
  }

  assertCreatorCanReadDocument(user, chant, {
    publishedField: 'isPublished',
    publishedValue: true,
  });

  return chant;
};

/**
 * Update Chant Service
 * 
 * Updates chant fields: title, description, instructions, coverImage,
 * estimatedDuration, starsAwarded, isPublished
 * Audio and SCORM file cannot be changed after creation
 * 
 * @param {String} chantId - Chant's MongoDB ID
 * @param {String} userId - Admin user's MongoDB ID (for verification)
 * @param {Object} updateData - Data to update
 * @param {Array} files - Uploaded files (coverImage only)
 * @returns {Object} Updated chant with populated data
 * @throws {Error} If chant not found or validation fails
 */
const updateChant = async (chantId, userId, updateData, files = {}, user = null) => {
  const {
    title,
    description,
    instructions,
    estimatedDuration,
    starsAwarded,
    isPublished,
  } = updateData;

  // Find chant
  const chant = await Chant.findById(chantId);

  if (!chant) {
    throw new Error('Chant not found');
  }

  assertCreatorOwnsDocument(user, chant);

  // Update title
  if (title !== undefined) {
    if (!title || !title.trim()) {
      throw new Error('Title cannot be empty');
    }
    chant.title = title.trim();
  }

  // Update description
  if (description !== undefined) {
    chant.description = description?.trim() || null;
  }

  // Update instructions
  if (instructions !== undefined) {
    chant.instructions = instructions?.trim() || null;
  }

  // Update estimated duration
  if (estimatedDuration !== undefined) {
    chant.estimatedDuration = estimatedDuration ? parseInt(estimatedDuration, 10) : null;
  }

  // Update stars awarded
  if (starsAwarded !== undefined) {
    const stars = parseInt(starsAwarded, 10);
    if (isNaN(stars) || stars < 0) {
      throw new Error('Stars awarded must be a non-negative number');
    }
    chant.starsAwarded = stars;
  }

  // Update published status
  if (isPublished !== undefined) {
    chant.isPublished = isPublished === 'true' || isPublished === true;
  }

  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const { url: coverUrl } = await s3Service.uploadFileFromMulter(coverImage, 'media/images');
    chant.coverImage = coverUrl;
  }

  if (files.audio && Array.isArray(files.audio) && files.audio.length > 0) {
    const audioFile = files.audio[0];

    if (chant.audio) {
      try {
        const oldAudioMedia = await Media.findById(chant.audio);
        if (oldAudioMedia && oldAudioMedia.filePath) {
          await s3Service.deleteByKey(oldAudioMedia.filePath);
        }
        await Media.findByIdAndDelete(chant.audio);
      } catch (error) {
        console.error('Error deleting previous chant audio:', error);
      }
    }

    const { url: audioFileUrl, s3Key: audioS3Key } = await s3Service.uploadFileFromMulter(audioFile, 'media/audio');
    const audioMedia = await Media.create({
      type: 'audio',
      title: audioFile.originalname,
      filePath: audioS3Key,
      url: audioFileUrl,
      mimeType: audioFile.mimetype,
      size: audioFile.size,
      uploadedBy: userId,
    });
    chant.audio = audioMedia._id;
  }

  if (files.scormFile && Array.isArray(files.scormFile) && files.scormFile.length > 0) {
    const scormFile = files.scormFile[0];

    if (chant.scormFile) {
      try {
        const oldScormMedia = await Media.findById(chant.scormFile);
        if (oldScormMedia && oldScormMedia.filePath) {
          await s3Service.deleteByKey(oldScormMedia.filePath);
        }
        await Media.findByIdAndDelete(chant.scormFile);
      } catch (error) {
        console.error('Error deleting previous chant SCORM file:', error);
      }
    }

    try {
      await s3Service.deleteByPrefix(`scorm/chant/${chant._id}`);
    } catch (error) {
      console.error('Error deleting previous extracted chant SCORM package:', error);
    }

    const { url: scormUrl, s3Key: scormS3Key } = await s3Service.uploadFileFromMulter(scormFile, 'activities/scorm');
    const scormMedia = await Media.create({
      type: 'video',
      title: scormFile.originalname,
      filePath: scormS3Key,
      url: scormUrl,
      mimeType: scormFile.mimetype,
      size: scormFile.size,
      uploadedBy: userId,
    });
    chant.scormFile = scormMedia._id;
    chant.scormFilePath = scormS3Key;
    chant.scormFileUrl = scormUrl;
    chant.scormFileSize = scormFile.size;
    chant.scormFileMimeType = scormFile.mimetype;

    if (scormFile.buffer) {
      const extracted = await scormService.uploadExtractedScormToS3(scormFile.buffer, 'chant', chant._id);
      if (extracted) {
        chant.scormBaseUrl = extracted.baseUrl;
        chant.scormEntryPoint = extracted.entryPoint;
      }
    }
  }

  const instructionVideoMedia = await resolveInstructionVideoMedia({
    userId,
    files,
    payload: updateData,
    titleFallback: `${chant.title || 'Chant'} instruction video`,
    existingMediaId: chant.instructionVideo,
  });
  if (instructionVideoMedia) {
    chant.instructionVideo = instructionVideoMedia._id;
  }

  await chant.save();

  // Get updated chant with populated data
  const updatedChant = await Chant.findById(chantId)
    .populate('audio', 'type title url mimeType size duration')
    .populate('instructionVideo', INSTRUCTION_VIDEO_POPULATE_SELECT)
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  return updatedChant;
};

/**
 * Delete Chant Service
 * 
 * Deletes a chant (hard delete - removes from database)
 * 
 * @param {String} chantId - Chant's MongoDB ID
 * @returns {Object} Deleted chant info
 * @throws {Error} If chant not found
 */
const deleteChant = async (chantId, user = null) => {
  const chant = await Chant.findById(chantId);

  if (!chant) {
    throw new Error('Chant not found');
  }

  assertCreatorOwnsDocument(user, chant);

  if (chant.audio) {
    try {
      const audioMedia = await Media.findById(chant.audio);
      if (audioMedia && audioMedia.filePath) await s3Service.deleteByKey(audioMedia.filePath);
      await Media.findByIdAndDelete(chant.audio);
    } catch (error) {
      console.error('Error deleting audio:', error);
    }
  }

  if (chant.instructionVideo) {
    await deleteInstructionVideoMedia(chant.instructionVideo);
  }

  if (chant.scormFile) {
    try {
      const scormMedia = await Media.findById(chant.scormFile);
      if (scormMedia && scormMedia.filePath) await s3Service.deleteByKey(scormMedia.filePath);
      await Media.findByIdAndDelete(chant.scormFile);
    } catch (error) {
      console.error('Error deleting SCORM file:', error);
    }
  }

  if (chant.coverImage) {
    try {
      const coverKey = s3Service.getS3KeyFromUrl(chant.coverImage);
      if (coverKey) await s3Service.deleteByKey(coverKey);
    } catch (error) {
      console.error('Error deleting cover image:', error);
    }
  }

  const deletedId = chant._id;

  await Chant.findByIdAndDelete(chantId);

  return { message: 'Chant deleted successfully', id: deletedId };
};

module.exports = {
  createChant,
  getAllChants,
  getChantById,
  updateChant,
  deleteChant,
};
