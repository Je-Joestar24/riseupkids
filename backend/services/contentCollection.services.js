const Course = require('../models/Course');
const Activity = require('../models/Activity');
const Book = require('../models/Book');
const Media = require('../models/Media');
const AudioAssignment = require('../models/AudioAssignment');
const fs = require('fs');
const path = require('path');

/**
 * Content Collection Service
 * 
 * Manages courses/collections that group mixed content types (Activities, Books, Videos, Audio)
 * Similar to Google Classroom structure
 */

/**
 * Create Course Service
 * 
 * Creates a new course/collection with optional contents
 * Can create new content items during course creation
 * Can add existing content items (unique only)
 * 
 * @param {String} userId - Admin user's MongoDB ID
 * @param {Object} courseData - Course data
 * @param {Array} files - Uploaded files (coverImage, and content files if creating new content)
 * @returns {Object} Created course with populated contents
 * @throws {Error} If validation fails
 */
const createCourse = async (userId, courseData, files = {}) => {
  const {
    title,
    description,
    isPublished,
    tags,
    // Contents to add (array of { contentId, contentType } or { newContent: {...} })
    contents = [],
  } = courseData;

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error('Please provide a course title');
  }

  // Process cover image if provided
  let coverImagePath = null;
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    // Convert absolute path to relative path starting with /uploads/
    const uploadsPath = path.join(__dirname, '../uploads');
    let coverRelativePath = coverImage.path;
    
    if (coverRelativePath.startsWith(uploadsPath)) {
      coverRelativePath = coverRelativePath.replace(uploadsPath, '').replace(/\\/g, '/');
      coverImagePath = `/uploads${coverRelativePath.startsWith('/') ? coverRelativePath : `/${coverRelativePath}`}`;
    } else if (coverRelativePath.includes('uploads')) {
      // If path already contains 'uploads', extract relative part
      const uploadsIndex = coverRelativePath.indexOf('uploads');
      coverRelativePath = coverRelativePath.substring(uploadsIndex).replace(/\\/g, '/');
      coverImagePath = `/${coverRelativePath}`;
    } else {
      // Fallback: use the path as-is if it's already relative
      coverImagePath = coverImage.path.replace(/\\/g, '/');
      if (!coverImagePath.startsWith('/uploads')) {
        coverImagePath = `/uploads/courses/${path.basename(coverImage.path)}`;
      }
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

  // Process contents array
  const courseContents = [];
  let orderIndex = 0;

  // Process each content item
  for (const contentItem of contents) {
    if (contentItem.newContent) {
      // Create new content during course creation
      const newContentData = contentItem.newContent;
      const contentType = newContentData.contentType;

      let createdContent = null;

      // Create content based on type
      // Note: This is a simplified version - you may want to call existing content services
      if (contentType === 'activity') {
        // Create activity (requires SCORM file)
        // For now, we'll just reference it - actual creation should use activity service
        throw new Error('Creating activities during course creation not yet implemented. Please create content first.');
      } else if (contentType === 'book') {
        throw new Error('Creating books during course creation not yet implemented. Please create content first.');
      } else if (contentType === 'video') {
        throw new Error('Creating videos during course creation not yet implemented. Please create content first.');
      } else if (contentType === 'audioAssignment') {
        throw new Error('Creating audio assignments during course creation not yet implemented. Please create content first.');
      }

      if (createdContent) {
        courseContents.push({
          contentId: createdContent._id,
          contentType: contentType,
          step: contentItem.step || 1, // Default to step 1 if not provided
          order: orderIndex++,
        });
      }
    } else if (contentItem.contentId && contentItem.contentType) {
      // Add existing content (validate it exists and is unique)
      const { contentId, contentType, step } = contentItem;

      // Verify content exists
      let contentExists = false;
      if (contentType === 'activity') {
        const activity = await Activity.findById(contentId);
        contentExists = !!activity;
      } else if (contentType === 'book') {
        const book = await Book.findById(contentId);
        contentExists = !!book;
      } else if (contentType === 'video') {
        // SCORM is optional for videos now
        const video = await Media.findOne({
          _id: contentId,
          type: 'video',
        });
        contentExists = !!video;
      } else if (contentType === 'audioAssignment') {
        const audio = await AudioAssignment.findById(contentId);
        contentExists = !!audio;
      }

      if (!contentExists) {
        throw new Error(`Content ${contentId} of type ${contentType} not found`);
      }

      // Check for duplicates (will be handled by pre-save hook, but we can check here too)
      const isDuplicate = courseContents.some(
        (item) => item.contentId.toString() === contentId.toString() && item.contentType === contentType
      );

      if (!isDuplicate) {
        courseContents.push({
          contentId: contentId,
          contentType: contentType,
          step: step || 1, // Default to step 1 if not provided
          order: orderIndex++,
        });
      }
    }
  }

  // Create course
  const course = await Course.create({
    title: title.trim(),
    description: description?.trim() || null,
    coverImage: coverImagePath,
    contents: courseContents,
    isPublished: isPublished === 'true' || isPublished === true,
    tags: parsedTags.filter(t => t && t.trim()).map(t => t.trim()),
    createdBy: userId,
  });

  // Get created course with populated data
  const createdCourse = await Course.findById(course._id)
    .populate('createdBy', 'name email')
    .lean();

  return createdCourse;
};

/**
 * Get All Courses Service
 * 
 * Retrieves all courses with optional filtering and pagination
 * 
 * @param {Object} queryParams - Query parameters
 * @param {Boolean} [queryParams.isPublished] - Filter by published status
 * @param {String} [queryParams.search] - Search in title/description
 * @param {Number} [queryParams.page] - Page number (default: 1)
 * @param {Number} [queryParams.limit] - Items per page (default: 10)
 * @returns {Object} Courses with pagination info
 */
const getAllCourses = async (queryParams = {}) => {
  const {
    isPublished,
    isArchived,
    search,
    page = 1,
    limit = 10,
  } = queryParams;

  // Build query
  const query = {};

  // By default, exclude archived courses unless explicitly requested
  if (isArchived === undefined || isArchived === 'false' || isArchived === false) {
    query.isArchived = false;
  } else if (isArchived === 'true' || isArchived === true) {
    query.isArchived = true;
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

  // Get courses
  const courses = await Course.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Get total count
  const total = await Course.countDocuments(query);

  return {
    courses,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get Course By ID Service
 * 
 * Retrieves a single course by ID with populated contents
 * 
 * @param {String} courseId - Course's MongoDB ID
 * @returns {Object} Course with populated contents
 * @throws {Error} If course not found
 */
const getCourseById = async (courseId, includeArchived = false) => {
  // By default, exclude archived courses unless explicitly requested
  const query = includeArchived ? { _id: courseId } : { _id: courseId, isArchived: false };
  const course = await Course.findOne(query)
    .populate('createdBy', 'name email')
    .lean();

  if (!course) {
    throw new Error('Course not found');
  }

  // Populate contents based on their types
  const populatedContents = [];

  for (const contentItem of course.contents || []) {
    let contentData = null;

    try {
      if (contentItem.contentType === 'activity') {
        const activity = await Activity.findById(contentItem.contentId)
          .populate('scormFile', 'type title url mimeType size')
          .populate('badgeAwarded', 'name description icon image category rarity')
          .lean();
        contentData = activity ? { ...activity, _contentType: 'activity' } : null;
      } else if (contentItem.contentType === 'book') {
        const book = await Book.findById(contentItem.contentId)
          .populate('scormFile', 'type title url mimeType size')
          .populate('badgeAwarded', 'name description icon image category rarity')
          .lean();
        contentData = book ? { ...book, _contentType: 'book' } : null;
      } else if (contentItem.contentType === 'video') {
        // SCORM is optional for videos now
        const video = await Media.findOne({
          _id: contentItem.contentId,
          type: 'video',
        })
          .populate('scormFile', 'type title url mimeType size')
          .populate('badgeAwarded', 'name description icon image category rarity')
          .lean();
        if (video) {
          contentData = {
            ...video,
            _contentType: 'video',
            coverImage: video.thumbnail || video.coverImage, // Map thumbnail to coverImage
          };
        }
      } else if (contentItem.contentType === 'audioAssignment') {
        const audio = await AudioAssignment.findById(contentItem.contentId)
          .populate('referenceAudio', 'type title url mimeType size duration')
          .populate('badgeAwarded', 'name description icon image category rarity')
          .lean();
        contentData = audio ? { ...audio, _contentType: 'audioAssignment' } : null;
      }

      if (contentData) {
        populatedContents.push({
          ...contentData,
          _order: contentItem.order,
          _step: contentItem.step || 1,
          _addedAt: contentItem.addedAt,
        });
      }
    } catch (error) {
      console.error(`Error populating content ${contentItem.contentId} (${contentItem.contentType}):`, error);
      // Continue with other contents even if one fails
    }
  }

  // Sort by: step -> contentType -> order
  populatedContents.sort((a, b) => {
    const stepA = a._step || 1;
    const stepB = b._step || 1;
    if (stepA !== stepB) {
      return stepA - stepB;
    }
    const typeA = a._contentType || '';
    const typeB = b._contentType || '';
    if (typeA !== typeB) {
      return typeA.localeCompare(typeB);
    }
    return (a._order || 0) - (b._order || 0);
  });

  // Get organized by steps structure
  const courseDoc = await Course.findById(courseId);
  const contentsBySteps = courseDoc ? courseDoc.getContentsBySteps() : [];

  return {
    ...course,
    contents: populatedContents,
    contentsBySteps, // Contents organized by steps and content types
  };
};

/**
 * Update Course Service
 * 
 * Updates course fields: title, description, coverImage, isPublished, tags
 * Can also reorder contents or add/remove contents
 * 
 * @param {String} courseId - Course's MongoDB ID
 * @param {String} userId - Admin user's MongoDB ID (for verification)
 * @param {Object} updateData - Data to update
 * @param {Array} files - Uploaded files (coverImage only)
 * @returns {Object} Updated course
 * @throws {Error} If course not found or validation fails
 */
const updateCourse = async (courseId, userId, updateData, files = {}) => {
  const {
    title,
    description,
    isPublished,
    tags,
    contents, // Optional: new contents array for reordering/adding/removing
  } = updateData;

  // Find course
  const course = await Course.findById(courseId);

  if (!course) {
    throw new Error('Course not found');
  }

  // Update title
  if (title !== undefined) {
    if (!title || !title.trim()) {
      throw new Error('Title cannot be empty');
    }
    course.title = title.trim();
  }

  // Update description
  if (description !== undefined) {
    course.description = description?.trim() || null;
  }

  // Update published status
  if (isPublished !== undefined) {
    course.isPublished = isPublished === 'true' || isPublished === true;
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
    course.tags = parsedTags.filter(t => t && t.trim()).map(t => t.trim());
  }

  // Update contents (reorder/add/remove)
  if (contents !== undefined && Array.isArray(contents)) {
    const newContents = [];
    let orderIndex = 0;

    for (const contentItem of contents) {
      if (contentItem.contentId && contentItem.contentType) {
        // Verify content exists
        let contentExists = false;
        if (contentItem.contentType === 'activity') {
          contentExists = !!(await Activity.findById(contentItem.contentId));
        } else if (contentItem.contentType === 'book') {
          contentExists = !!(await Book.findById(contentItem.contentId));
        } else if (contentItem.contentType === 'video') {
          // SCORM is optional for videos now
          contentExists = !!(await Media.findOne({
            _id: contentItem.contentId,
            type: 'video',
          }));
        } else if (contentItem.contentType === 'audioAssignment') {
          contentExists = !!(await AudioAssignment.findById(contentItem.contentId));
        }

        if (contentExists) {
          newContents.push({
            contentId: contentItem.contentId,
            contentType: contentItem.contentType,
            order: orderIndex++,
            addedAt: contentItem.addedAt || new Date(),
          });
        }
      }
    }

    course.contents = newContents;
  }

  // Process cover image if provided
  if (files.coverImage && Array.isArray(files.coverImage) && files.coverImage.length > 0) {
    const coverImage = files.coverImage[0];
    // Convert absolute path to relative path starting with /uploads/
    const uploadsPath = path.join(__dirname, '../uploads');
    let coverRelativePath = coverImage.path;
    
    if (coverRelativePath.startsWith(uploadsPath)) {
      coverRelativePath = coverRelativePath.replace(uploadsPath, '').replace(/\\/g, '/');
      const coverImagePath = `/uploads${coverRelativePath.startsWith('/') ? coverRelativePath : `/${coverRelativePath}`}`;
      course.coverImage = coverImagePath;
    } else if (coverRelativePath.includes('uploads')) {
      // If path already contains 'uploads', extract relative part
      const uploadsIndex = coverRelativePath.indexOf('uploads');
      coverRelativePath = coverRelativePath.substring(uploadsIndex).replace(/\\/g, '/');
      course.coverImage = `/${coverRelativePath}`;
    } else {
      // Fallback: use the path as-is if it's already relative
      let coverImagePath = coverImage.path.replace(/\\/g, '/');
      if (!coverImagePath.startsWith('/uploads')) {
        coverImagePath = `/uploads/courses/${path.basename(coverImage.path)}`;
      }
      course.coverImage = coverImagePath;
    }
  }

  await course.save();

  // Get updated course with populated data
  const updatedCourse = await Course.findById(courseId)
    .populate('createdBy', 'name email')
    .lean();

  return updatedCourse;
};

/**
 * Archive Course Service
 * 
 * Archives a course (soft delete - sets isArchived to true)
 * Archived courses are hidden from normal listings but can be restored
 * 
 * @param {String} courseId - Course's MongoDB ID
 * @returns {Object} Archived course info
 * @throws {Error} If course not found
 */
const archiveCourse = async (courseId) => {
  const course = await Course.findById(courseId);

  if (!course) {
    throw new Error('Course not found');
  }

  if (course.isArchived) {
    throw new Error('Course is already archived');
  }

  course.isArchived = true;
  await course.save();

  return { message: 'Course archived successfully', id: courseId };
};

/**
 * Unarchive Course Service
 * 
 * Restores an archived course (sets isArchived to false)
 * 
 * @param {String} courseId - Course's MongoDB ID
 * @returns {Object} Unarchived course info
 * @throws {Error} If course not found
 */
const unarchiveCourse = async (courseId) => {
  const course = await Course.findById(courseId);

  if (!course) {
    throw new Error('Course not found');
  }

  if (!course.isArchived) {
    throw new Error('Course is not archived');
  }

  course.isArchived = false;
  await course.save();

  return { message: 'Course unarchived successfully', id: courseId };
};

/**
 * Delete Course Service
 * 
 * Deletes a course permanently (hard delete - removes from database)
 * This action cannot be undone
 * 
 * @param {String} courseId - Course's MongoDB ID
 * @returns {Object} Deleted course info
 * @throws {Error} If course not found
 */
const deleteCourse = async (courseId) => {
  const course = await Course.findById(courseId);

  if (!course) {
    throw new Error('Course not found');
  }

  // Delete cover image if exists
  if (course.coverImage && fs.existsSync(path.join(__dirname, '../', course.coverImage.replace('/uploads', 'uploads')))) {
    try {
      fs.unlinkSync(path.join(__dirname, '../', course.coverImage.replace('/uploads', 'uploads')));
    } catch (error) {
      console.error('Error deleting cover image:', error);
    }
  }

  await Course.findByIdAndDelete(courseId);

  return { message: 'Course deleted successfully', id: courseId };
};

/**
 * Get Default Courses Service
 * 
 * Retrieves all courses marked as default
 * 
 * @returns {Array} Array of default courses
 */
const getDefaultCourses = async () => {
  const courses = await Course.find({
    isDefault: true,
    isPublished: true,
    isArchived: false,
  })
    .sort({ stepOrder: 1, createdAt: 1 })
    .populate('createdBy', 'name email')
    .lean();

  return courses;
};

/**
 * Toggle Default Status Service
 * 
 * Marks or unmarks a course as default
 * 
 * @param {String} courseId - Course's MongoDB ID
 * @param {Boolean} isDefault - Whether to mark as default
 * @returns {Object} Updated course
 * @throws {Error} If course not found
 */
const toggleDefaultStatus = async (courseId, isDefault) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  course.isDefault = isDefault;
  await course.save();

  return course;
};

module.exports = {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  archiveCourse,
  unarchiveCourse,
  deleteCourse,
  getDefaultCourses,
  toggleDefaultStatus,
};

