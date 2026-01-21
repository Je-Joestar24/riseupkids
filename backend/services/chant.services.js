const { Chant, Media, Badge } = require('../models');
const fs = require('fs');
const path = require('path');

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

  // Process audio if provided (optional)
  let audioId = null;
  if (files.audio && Array.isArray(files.audio) && files.audio.length > 0) {
    const audioFile = files.audio[0];
    const audioRelativePath = audioFile.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    const audioFileUrl = `/uploads${audioRelativePath.startsWith('/') ? audioRelativePath : `/${audioRelativePath}`}`;
    
    const audioMedia = await Media.create({
      type: 'audio',
      title: audioFile.originalname,
      filePath: audioFile.path,
      url: audioFileUrl,
      mimeType: audioFile.mimetype,
      size: audioFile.size,
      uploadedBy: userId,
    });

    audioId = audioMedia._id;
  }

  // Process instruction video if provided (optional)
  let instructionVideoId = null;
  if (files.instructionVideo && Array.isArray(files.instructionVideo) && files.instructionVideo.length > 0) {
    const instructionVideo = files.instructionVideo[0];
    const videoRelativePath = instructionVideo.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    const videoFileUrl = `/uploads${videoRelativePath.startsWith('/') ? videoRelativePath : `/${videoRelativePath}`}`;
    
    const videoMedia = await Media.create({
      type: 'video',
      title: instructionVideo.originalname,
      filePath: instructionVideo.path,
      url: videoFileUrl,
      mimeType: instructionVideo.mimetype,
      size: instructionVideo.size,
      uploadedBy: userId,
    });

    instructionVideoId = videoMedia._id;
  }

  // Process SCORM file if provided (optional)
  let scormFileId = null;
  let scormFilePath = null;
  let scormFileUrl = null;
  let scormFileSize = null;
  let scormFileMimeType = null;
  
  if (files.scormFile && Array.isArray(files.scormFile) && files.scormFile.length > 0) {
    const scormFile = files.scormFile[0];
    const relativePath = scormFile.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    scormFileUrl = `/uploads${relativePath.startsWith('/') ? relativePath : `/${relativePath}`}`;
    
    const scormMedia = await Media.create({
      type: 'video', // Using 'video' type for SCORM files
      title: scormFile.originalname,
      filePath: scormFile.path,
      url: scormFileUrl,
      mimeType: scormFile.mimetype,
      size: scormFile.size,
      uploadedBy: userId,
    });

    scormFileId = scormMedia._id;
    scormFilePath = scormFile.path;
    scormFileSize = scormFile.size;
    scormFileMimeType = scormFile.mimetype;
  }

  // Process cover image if provided (optional)
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

  // Create chant
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

  // Get created chant with populated data
  const createdChant = await Chant.findById(chant._id)
    .populate('audio', 'type title url mimeType size duration')
    .populate('instructionVideo', 'type title url mimeType size duration')
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
    isPublished,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  // Build query
  const query = {};

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

  // Pagination
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Get chants
  const chants = await Chant.find(query)
    .populate('audio', 'type title url mimeType size duration')
    .populate('instructionVideo', 'type title url mimeType size duration')
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
const getChantById = async (chantId) => {
  const chant = await Chant.findById(chantId)
    .populate('audio', 'type title url mimeType size duration')
    .populate('instructionVideo', 'type title url mimeType size duration')
    .populate('scormFile', 'type title url mimeType size')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('createdBy', 'name email')
    .lean();

  if (!chant) {
    throw new Error('Chant not found');
  }

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
const updateChant = async (chantId, userId, updateData, files = {}) => {
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

  // Process cover image if provided
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const coverRelativePath = coverImage.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    const coverImagePath = `/uploads${coverRelativePath.startsWith('/') ? coverRelativePath : `/${coverRelativePath}`}`;
    chant.coverImage = coverImagePath;
  }

  // Process instruction video if provided (allows adding/updating video)
  if (files.instructionVideo && Array.isArray(files.instructionVideo) && files.instructionVideo.length > 0) {
    const instructionVideo = files.instructionVideo[0];
    const videoRelativePath = instructionVideo.path.replace(path.join(__dirname, '../uploads'), '').replace(/\\/g, '/');
    const videoFileUrl = `/uploads${videoRelativePath.startsWith('/') ? videoRelativePath : `/${videoRelativePath}`}`;
    
    const videoMedia = await Media.create({
      type: 'video',
      title: instructionVideo.originalname,
      filePath: instructionVideo.path,
      url: videoFileUrl,
      mimeType: instructionVideo.mimetype,
      size: instructionVideo.size,
      uploadedBy: userId,
    });

    chant.instructionVideo = videoMedia._id;
  }

  await chant.save();

  // Get updated chant with populated data
  const updatedChant = await Chant.findById(chantId)
    .populate('audio', 'type title url mimeType size duration')
    .populate('instructionVideo', 'type title url mimeType size duration')
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
const deleteChant = async (chantId) => {
  const chant = await Chant.findById(chantId);

  if (!chant) {
    throw new Error('Chant not found');
  }

  // Delete audio if exists
  if (chant.audio) {
    try {
      const audioMedia = await Media.findById(chant.audio);
      if (audioMedia && audioMedia.filePath && fs.existsSync(audioMedia.filePath)) {
        fs.unlinkSync(audioMedia.filePath);
      }
      await Media.findByIdAndDelete(chant.audio);
    } catch (error) {
      console.error('Error deleting audio:', error);
    }
  }

  // Delete instruction video if exists
  if (chant.instructionVideo) {
    try {
      const videoMedia = await Media.findById(chant.instructionVideo);
      if (videoMedia && videoMedia.filePath && fs.existsSync(videoMedia.filePath)) {
        fs.unlinkSync(videoMedia.filePath);
      }
      await Media.findByIdAndDelete(chant.instructionVideo);
    } catch (error) {
      console.error('Error deleting instruction video:', error);
    }
  }

  // Delete SCORM file if exists
  if (chant.scormFile) {
    try {
      const scormMedia = await Media.findById(chant.scormFile);
      if (scormMedia && scormMedia.filePath && fs.existsSync(scormMedia.filePath)) {
        fs.unlinkSync(scormMedia.filePath);
      }
      await Media.findByIdAndDelete(chant.scormFile);
    } catch (error) {
      console.error('Error deleting SCORM file:', error);
    }
  }

  // Delete cover image if exists
  if (chant.coverImage && fs.existsSync(path.join(__dirname, '../', chant.coverImage.replace('/uploads', 'uploads')))) {
    try {
      fs.unlinkSync(path.join(__dirname, '../', chant.coverImage.replace('/uploads', 'uploads')));
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
