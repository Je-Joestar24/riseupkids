const { Media, Badge, CmsBook } = require('../models');
const s3Service = require('./s3.service');
const scormService = require('./scorm.service');
const html5handlerService = require('./html5handler.service');
const { assertBunnyIframeEmbedUrl } = require('../utils/bunnyEmbed.util');
const { applyCreatorOwnershipFilter, assertCreatorOwnsDocument, isContentCreator } = require('../utils/contentOwnership');
const { COURSE_VIDEO_MEDIA_TAG } = require('../constants/courseVideoMedia');
const { isCourseVideoMedia } = require('../utils/courseVideoMedia.util');

const applyVideoOwnershipFilter = (user, baseQuery = {}) => {
  const ownerFilter = applyCreatorOwnershipFilter(user, baseQuery);
  if (isContentCreator(user)) {
    ownerFilter.uploadedBy = ownerFilter.createdBy;
    delete ownerFilter.createdBy;
  }
  return ownerFilter;
};

const assertVideoOwnership = (user, video, message) => {
  assertCreatorOwnsDocument(user, { ...video, createdBy: video?.uploadedBy ?? video?.createdBy }, message);
};

const assertCourseVideo = (video) => {
  if (!isCourseVideoMedia(video)) {
    throw new Error('Video not found');
  }
};

/**
 * Create Video Service
 * 
 * Creates a new video with either an uploaded playable file or a Bunny Stream iframe embed URL,
 * optional SCORM (upload path only), and optional cover image.
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
    videoSource: videoSourceRaw,
    embedUrl: embedUrlRaw,
    completionContentType: completionContentTypeRaw,
    cmsBookId,
  } = videoData;

  const videoSource =
    typeof videoSourceRaw === 'string' && videoSourceRaw.trim().toLowerCase() === 'embed'
      ? 'embed'
      : 'upload';

  const hasVideoFile =
    files.videoFile && Array.isArray(files.videoFile) && files.videoFile.length > 0;
  const hasScormFile =
    files.scormFile && Array.isArray(files.scormFile) && files.scormFile.length > 0;
  const hasHtml5File =
    files.html5File && Array.isArray(files.html5File) && files.html5File.length > 0;
  const requestedCompletionType = String(completionContentTypeRaw || '').trim().toLowerCase();
  const completionContentType =
    requestedCompletionType === 'html5'
      ? 'html5'
      : requestedCompletionType === 'builtin'
        ? 'builtin'
        : hasScormFile
          ? 'scorm'
          : 'none';

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error('Please provide a video title');
  }

  if (videoSource === 'embed') {
    if (hasVideoFile) {
      throw new Error('Do not attach a video file when using videoSource embed');
    }
    if (hasScormFile) {
      throw new Error('SCORM file is not supported when using Bunny embed; use upload for SCORM packages');
    }
  } else if (!hasVideoFile) {
    throw new Error('Please provide a video file');
  }

  if (completionContentType === 'html5' && !hasHtml5File) {
    throw new Error('Please upload an HTML5 package ZIP for the video follow-up');
  }

  if (completionContentType === 'builtin') {
    if (!cmsBookId || !String(cmsBookId).trim()) {
      throw new Error('Please select a built-in CMS book for the video follow-up');
    }
    const cmsBook = await CmsBook.findOne({
      _id: cmsBookId,
      status: 'published',
      isArchived: false,
    }).select('_id').lean();
    if (!cmsBook) {
      throw new Error('Built-in CMS book not found, not published, or archived');
    }
  }

  const videoFile = hasVideoFile ? files.videoFile[0] : null;
  const scormFile = hasScormFile ? files.scormFile[0] : null;
  const html5File = hasHtml5File ? files.html5File[0] : null;

  // Validate badge if provided
  if (badgeAwarded) {
    const badge = await Badge.findById(badgeAwarded);
    if (!badge) {
      throw new Error('Invalid badge ID');
    }
  }

  let videoMedia;

  if (videoSource === 'embed') {
    const canonicalEmbed = assertBunnyIframeEmbedUrl(embedUrlRaw);
    videoMedia = await Media.create({
      type: 'video',
      videoSource: 'embed',
      embedUrl: canonicalEmbed,
      cloudUrl: canonicalEmbed,
      title: title?.trim() || 'Embedded video',
      description: description?.trim() || null,
      duration: duration ? parseInt(duration, 10) : null,
      starsAwarded: starsAwarded ? parseInt(starsAwarded, 10) : 10,
      requiredWatchCount: requiredWatchCount ? parseInt(requiredWatchCount, 10) : 5,
      completionContentType,
      cmsBookId: completionContentType === 'builtin' ? cmsBookId : null,
      isPublished: isPublished === 'true' || isPublished === true,
      uploadedBy: userId,
      tags: [COURSE_VIDEO_MEDIA_TAG],
    });
  } else {
    const { url: videoFileUrl, s3Key: videoS3Key } = await s3Service.uploadFileFromMulter(videoFile, 'media/videos');
    videoMedia = await Media.create({
      type: 'video',
      videoSource: 'upload',
      title: title?.trim() || videoFile.originalname,
      description: description?.trim() || null,
      filePath: videoS3Key,
      url: videoFileUrl,
      mimeType: videoFile.mimetype,
      size: videoFile.size,
      duration: duration ? parseInt(duration, 10) : null,
      starsAwarded: starsAwarded ? parseInt(starsAwarded, 10) : 10,
      requiredWatchCount: requiredWatchCount ? parseInt(requiredWatchCount, 10) : 5,
      completionContentType,
      cmsBookId: completionContentType === 'builtin' ? cmsBookId : null,
      isPublished: isPublished === 'true' || isPublished === true,
      uploadedBy: userId,
      tags: [COURSE_VIDEO_MEDIA_TAG],
    });
  }

  if (badgeAwarded) {
    videoMedia.badgeAwarded = badgeAwarded;
  }

  if (scormFile) {
    const { url: scormFileUrl, s3Key: scormS3Key } = await s3Service.uploadFileFromMulter(scormFile, 'activities/scorm');
    const scormMedia = await Media.create({
      type: 'video',
      title: scormFile.originalname,
      filePath: scormS3Key,
      url: scormFileUrl,
      mimeType: scormFile.mimetype,
      size: scormFile.size,
      uploadedBy: userId,
    });
    videoMedia.scormFile = scormMedia._id;
    videoMedia.scormFilePath = scormS3Key;
    videoMedia.scormFileUrl = scormFileUrl;
    videoMedia.scormFileSize = scormFile.size;
    videoMedia.completionContentType = 'scorm';
  }

  await videoMedia.save();

  if (completionContentType === 'html5' && html5File) {
    const zipInput = html5File.buffer || html5File.path;
    const { id, entryPoint, baseUrl } = await html5handlerService.extractAndUploadToS3Only(zipInput);
    videoMedia.completionContentType = 'html5';
    videoMedia.html5PackageId = id;
    videoMedia.html5EntryPoint = entryPoint || 'index.html';
    videoMedia.html5BaseUrl = baseUrl || null;
    videoMedia.cmsBookId = null;
    await videoMedia.save();
  }

  if (scormFile && scormFile.buffer) {
    const extracted = await scormService.uploadExtractedScormToS3(scormFile.buffer, 'video', videoMedia._id);
    if (extracted) {
      videoMedia.scormBaseUrl = extracted.baseUrl;
      videoMedia.scormEntryPoint = extracted.entryPoint;
      await videoMedia.save();
    }
  }

  let coverImagePath = null;
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const { url: coverUrl } = await s3Service.uploadFileFromMulter(coverImage, 'media/images');
    coverImagePath = coverUrl;
    videoMedia.thumbnail = coverUrl;
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

  videoMedia.tags = [
    COURSE_VIDEO_MEDIA_TAG,
    ...parsedTags.filter((t) => t && t.trim()).map((t) => t.trim()),
  ].filter((tag, index, arr) => arr.indexOf(tag) === index);
  await videoMedia.save();

  // Get created video with populated data
  const createdVideo = await Media.findById(videoMedia._id)
    .populate('scormFile', 'type title url mimeType size')
    .populate('cmsBookId', 'title description status language version isArchived pages')
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
    user,
    isActive,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  // Only list Media explicitly created for the course Videos content type.
  const query = applyVideoOwnershipFilter(user, {
    type: 'video',
    tags: COURSE_VIDEO_MEDIA_TAG,
  });

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
    .populate('cmsBookId', 'title description status language version isArchived pages')
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
const getVideoById = async (videoId, user = null) => {
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  })
    .populate('scormFile', 'type title url mimeType size')
    .populate('cmsBookId', 'title description status language version isArchived pages')
    .populate('badgeAwarded', 'name description icon image category rarity')
    .populate('uploadedBy', 'name email')
    .lean();

  if (!video) {
    throw new Error('Video not found');
  }

  assertCourseVideo(video);
  assertVideoOwnership(user, video);

  return video;
};

/**
 * Update Video Service
 * 
 * Updates video fields: title, description, thumbnail (cover image), duration, starsAwarded, optional embedUrl (Bunny embed only)
 * Main video file and SCORM file cannot be swapped after creation
 * 
 * @param {String} videoId - Video's MongoDB ID
 * @param {String} userId - Admin user's MongoDB ID (for verification)
 * @param {Object} updateData - Data to update
 * @param {Array} files - Uploaded files (coverImage only)
 * @returns {Object} Updated video with populated data
 * @throws {Error} If video not found or validation fails
 */
const updateVideo = async (videoId, userId, updateData, files = {}, user = null) => {
  const {
    title,
    description,
    duration,
    starsAwarded,
    badgeAwarded,
    isPublished,
    requiredWatchCount,
    embedUrl,
    completionContentType: completionContentTypeRaw,
    cmsBookId,
  } = updateData;

  // Find video (SCORM is optional)
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  });

  if (!video) {
    throw new Error('Video not found');
  }

  assertCourseVideo(video);
  assertVideoOwnership(user, video);

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

  // Update embed URL (Bunny iframe only)
  if (embedUrl !== undefined) {
    if ((video.videoSource || 'upload') !== 'embed') {
      throw new Error('embedUrl can only be updated for Bunny embed videos');
    }
    const canonical = assertBunnyIframeEmbedUrl(
      typeof embedUrl === 'string' ? embedUrl : String(embedUrl ?? '')
    );
    video.embedUrl = canonical;
    video.cloudUrl = canonical;
    video.url = canonical;
  }

  const hasHtml5File =
    files.html5File && Array.isArray(files.html5File) && files.html5File.length > 0;
  const shouldUpdateCompletion = completionContentTypeRaw !== undefined || hasHtml5File;

  if (shouldUpdateCompletion) {
    const nextCompletionType = String(completionContentTypeRaw || '').trim().toLowerCase();

    if (nextCompletionType === 'html5' || hasHtml5File) {
      if (hasHtml5File) {
        if (video.html5PackageId) {
          try {
            await s3Service.deleteByPrefix(`html5/${video.html5PackageId}`);
          } catch (error) {
            console.error('Error deleting previous HTML5 package:', error);
          }
        }
        const html5File = files.html5File[0];
        const zipInput = html5File.buffer || html5File.path;
        const { id, entryPoint, baseUrl } = await html5handlerService.extractAndUploadToS3Only(zipInput);
        video.html5PackageId = id;
        video.html5EntryPoint = entryPoint || 'index.html';
        video.html5BaseUrl = baseUrl || null;
      } else if (!video.html5PackageId) {
        throw new Error('Please upload an HTML5 package ZIP for the video follow-up');
      }
      video.completionContentType = 'html5';
      video.cmsBookId = null;
    } else if (nextCompletionType === 'builtin') {
      if (!cmsBookId || !String(cmsBookId).trim()) {
        throw new Error('Please select a built-in CMS book for the video follow-up');
      }
      const cmsBook = await CmsBook.findOne({
        _id: cmsBookId,
        status: 'published',
        isArchived: false,
      }).select('_id').lean();
      if (!cmsBook) {
        throw new Error('Built-in CMS book not found, not published, or archived');
      }
      video.completionContentType = 'builtin';
      video.cmsBookId = cmsBookId;
      video.html5PackageId = null;
      video.html5EntryPoint = 'index.html';
      video.html5BaseUrl = null;
    } else if (nextCompletionType === 'none' || nextCompletionType === '') {
      video.completionContentType = 'none';
      video.cmsBookId = null;
      video.html5PackageId = null;
      video.html5EntryPoint = 'index.html';
      video.html5BaseUrl = null;
    }
  }

  // Process cover image if provided
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    const { url: coverUrl } = await s3Service.uploadFileFromMulter(coverImage, 'media/images');
    video.thumbnail = coverUrl;
  }

  await video.save();

  // Get updated video with populated data
  const updatedVideo = await Media.findById(videoId)
    .populate('scormFile', 'type title url mimeType size')
    .populate('cmsBookId', 'title description status language version isArchived pages')
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
const deleteVideo = async (videoId, user = null) => {
  const video = await Media.findOne({
    _id: videoId,
    type: 'video',
  });

  if (!video) {
    throw new Error('Video not found');
  }

  assertCourseVideo(video);
  assertVideoOwnership(user, video);

  try {
    if ((video.videoSource || 'upload') !== 'embed' && video.filePath) {
      await s3Service.deleteByKey(video.filePath);
    }
  } catch (error) {
    console.error('Error deleting video file from S3:', error);
  }

  if (video.scormFile) {
    try {
      const scormMedia = await Media.findById(video.scormFile);
      if (scormMedia && scormMedia.filePath) await s3Service.deleteByKey(scormMedia.filePath);
      await Media.findByIdAndDelete(video.scormFile);
    } catch (error) {
      console.error('Error deleting SCORM file:', error);
    }
  }

  if (video.html5PackageId) {
    try {
      await s3Service.deleteByPrefix(`html5/${video.html5PackageId}`);
    } catch (error) {
      console.error('Error deleting HTML5 package:', error);
    }
  }

  if (video.thumbnail) {
    try {
      const thumbKey = s3Service.getS3KeyFromUrl(video.thumbnail);
      if (thumbKey) await s3Service.deleteByKey(thumbKey);
    } catch (error) {
      console.error('Error deleting thumbnail from S3:', error);
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

