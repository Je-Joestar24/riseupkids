const { ChildProfile, Journey, Lesson, Course, CourseProgress, ChildStats } = require('../models');

/**
 * Get All Children Service
 * 
 * Retrieves all child profiles for the logged-in parent
 * 
 * @param {String} parentId - Parent's MongoDB ID
 * @param {Object} queryParams - Optional query parameters
 * @param {Boolean} queryParams.isActive - Filter by active status
 * @returns {Array} Array of child profiles
 */
const getAllChildren = async (parentId, queryParams = {}) => {
  const { isActive } = queryParams;

  // Build query
  const query = { parent: parentId };

  // Active status filter
  if (isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }

  // Get all children for this parent
  const children = await ChildProfile.find(query)
    .select('displayName age avatar currentJourney currentLesson preferences isActive createdAt updatedAt')
    .populate('currentJourney', 'title description order')
    .populate('currentLesson', 'title description order')
    .sort({ createdAt: -1 }) // Newest first
    .lean();

  // Populate stats for each child
  const childrenWithStats = await Promise.all(
    children.map(async (child) => {
      const stats = await ChildStats.findOne({ child: child._id })
        .select('totalStars currentStreak totalBadges badges')
        .lean();
      
      return {
        ...child,
        stats: stats || {
          totalStars: 0,
          currentStreak: 0,
          totalBadges: 0,
          badges: [],
        },
      };
    })
  );

  return childrenWithStats;
};

/**
 * Get Single Child Service
 * 
 * Retrieves a single child profile by ID (only if belongs to parent)
 * 
 * @param {String} childId - Child profile's MongoDB ID
 * @param {String} parentId - Parent's MongoDB ID (for verification)
 * @returns {Object} Child profile data
 * @throws {Error} If child not found or doesn't belong to parent
 */
const getChildById = async (childId, parentId) => {
  const child = await ChildProfile.findOne({
    _id: childId,
    parent: parentId,
  })
    .populate('currentJourney', 'title description order')
    .populate('currentLesson', 'title description order')
    .lean();

  if (!child) {
    throw new Error('Child profile not found or does not belong to you');
  }

  // Populate stats
  const stats = await ChildStats.findOne({ child: childId })
    .select('totalStars currentStreak totalBadges badges')
    .lean();

  return {
    ...child,
    stats: stats || {
      totalStars: 0,
      currentStreak: 0,
      totalBadges: 0,
      badges: [],
    },
  };
};

/**
 * Create Child Service
 * 
 * Creates a new child profile for the logged-in parent
 * 
 * @param {String} parentId - Parent's MongoDB ID
 * @param {Object} childData - Child profile data
 * @param {String} childData.displayName - Child's display name (required)
 * @param {Number} [childData.age] - Child's age (0-18)
 * @param {String} [childData.avatar] - Avatar file path or URL
 * @param {String} [childData.currentJourney] - Current journey ID
 * @param {String} [childData.currentLesson] - Current lesson ID
 * @param {Object} [childData.preferences] - Child preferences
 * @returns {Object} Created child profile
 * @throws {Error} If validation fails
 */
const createChild = async (parentId, childData) => {
  const {
    displayName,
    age,
    avatar,
    currentJourney,
    currentLesson,
    preferences,
  } = childData;

  // Validate required fields
  if (!displayName || !displayName.trim()) {
    throw new Error('Please provide a display name');
  }

  // Validate age if provided
  if (age !== undefined) {
    if (age < 0 || age > 18) {
      throw new Error('Age must be between 0 and 18');
    }
  }

  // Validate journey if provided
  if (currentJourney) {
    const journey = await Journey.findById(currentJourney);
    if (!journey) {
      throw new Error('Invalid journey ID');
    }
  }

  // Validate lesson if provided
  if (currentLesson) {
    const lesson = await Lesson.findById(currentLesson);
    if (!lesson) {
      throw new Error('Invalid lesson ID');
    }
  }

  // Create child profile
  const child = await ChildProfile.create({
    parent: parentId,
    displayName: displayName.trim(),
    age: age !== undefined ? parseInt(age, 10) : undefined,
    avatar: avatar || null,
    currentJourney: currentJourney || null,
    currentLesson: currentLesson || null,
    preferences: {
      language: preferences?.language || 'en',
      theme: preferences?.theme || 'light',
      soundEnabled: preferences?.soundEnabled !== undefined ? preferences.soundEnabled : true,
    },
    isActive: true,
  });

  // Assign default courses to the new child
  await assignDefaultCourses(child._id, child.age);

  // Get created child with populated fields
  const createdChild = await ChildProfile.findById(child._id)
    .populate('currentJourney', 'title description order')
    .populate('currentLesson', 'title description order')
    .lean();

  return createdChild;
};

/**
 * Assign default courses to a child
 * Finds all default courses and creates CourseProgress entries
 * First course is unlocked, others are locked (if sequential)
 * 
 * @param {String} childId - Child's MongoDB ID
 * @param {Number} childAge - Child's age (optional, for age-based filtering)
 * @returns {Array} Array of assigned default courses
 */
const assignDefaultCourses = async (childId, childAge) => {
  // Find all default courses
  let query = { isDefault: true, isPublished: true, isArchived: false };

  // Optional: Filter by age range if child has age
  if (childAge !== undefined && childAge !== null) {
    query.$or = [
      { ageRange: { $exists: false } }, // No age restriction
      {
        $and: [
          {
            $or: [
              { 'ageRange.min': { $exists: false } }, // No min age
              { 'ageRange.min': { $lte: childAge } },
            ],
          },
          {
            $or: [
              { 'ageRange.max': { $exists: false } }, // No max age
              { 'ageRange.max': { $gte: childAge } },
            ],
          },
        ],
      },
    ];
  }

  const defaultCourses = await Course.find(query).sort({ stepOrder: 1, createdAt: 1 });

  if (defaultCourses.length === 0) {
    return []; // No default courses to assign
  }

  // Create CourseProgress entries for each default course
  // Enforce 1-course limit: only 1 course can be in "in_progress" or "not_started" at a time
  // The first course is automatically set to "in_progress" to start it immediately
  const progressEntries = [];
  let unlockedCount = 0;
  const MAX_IN_PROGRESS = 1;

  for (const course of defaultCourses) {
    // Determine initial status
    let initialStatus = 'locked'; // Default to locked
    
    // If course is sequential and has prerequisites, it's locked
    if (course.isSequential && course.prerequisites && course.prerequisites.length > 0) {
      initialStatus = 'locked';
    } else if (unlockedCount < MAX_IN_PROGRESS) {
      // First course without prerequisites is unlocked and set to "in_progress" (not "not_started")
      initialStatus = 'in_progress'; // Automatically start the first course
      unlockedCount++;
    }
    // All other courses remain locked

    progressEntries.push({
      child: childId,
      course: course._id,
      status: initialStatus,
      progressPercentage: 0,
      startedAt: initialStatus === 'in_progress' ? new Date() : null,
      currentStep: initialStatus === 'in_progress' ? 1 : undefined,
    });
  }

  if (progressEntries.length > 0) {
    await CourseProgress.insertMany(progressEntries);
  }

  return defaultCourses;
};

/**
 * Update Child Service
 * 
 * Updates a child profile (only if belongs to parent)
 * 
 * @param {String} childId - Child profile's MongoDB ID
 * @param {String} parentId - Parent's MongoDB ID (for verification)
 * @param {Object} updateData - Data to update
 * @param {String} [updateData.displayName] - Child's display name
 * @param {Number} [updateData.age] - Child's age (0-18)
 * @param {String} [updateData.avatar] - Avatar file path or URL
 * @param {String} [updateData.currentJourney] - Current journey ID
 * @param {String} [updateData.currentLesson] - Current lesson ID
 * @param {Object} [updateData.preferences] - Child preferences
 * @param {Boolean} [updateData.isActive] - Active status
 * @returns {Object} Updated child profile
 * @throws {Error} If child not found or validation fails
 */
const updateChild = async (childId, parentId, updateData) => {
  const {
    displayName,
    age,
    avatar,
    currentJourney,
    currentLesson,
    preferences,
    isActive,
  } = updateData;

  // Find child and verify it belongs to parent
  const child = await ChildProfile.findOne({
    _id: childId,
    parent: parentId,
  });

  if (!child) {
    throw new Error('Child profile not found or does not belong to you');
  }

  // Update fields
  if (displayName !== undefined) {
    if (!displayName.trim()) {
      throw new Error('Display name cannot be empty');
    }
    child.displayName = displayName.trim();
  }

  if (age !== undefined) {
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 18) {
      throw new Error('Age must be a number between 0 and 18');
    }
    child.age = ageNum;
  }

  if (avatar !== undefined) {
    child.avatar = avatar || null;
  }

  if (currentJourney !== undefined) {
    if (currentJourney) {
      const journey = await Journey.findById(currentJourney);
      if (!journey) {
        throw new Error('Invalid journey ID');
      }
    }
    child.currentJourney = currentJourney || null;
  }

  if (currentLesson !== undefined) {
    if (currentLesson) {
      const lesson = await Lesson.findById(currentLesson);
      if (!lesson) {
        throw new Error('Invalid lesson ID');
      }
    }
    child.currentLesson = currentLesson || null;
  }

  if (preferences !== undefined) {
    if (preferences.language !== undefined) {
      child.preferences.language = preferences.language;
    }
    if (preferences.theme !== undefined) {
      if (!['light', 'dark', 'auto'].includes(preferences.theme)) {
        throw new Error('Theme must be light, dark, or auto');
      }
      child.preferences.theme = preferences.theme;
    }
    if (preferences.soundEnabled !== undefined) {
      child.preferences.soundEnabled = preferences.soundEnabled;
    }
  }

  if (isActive !== undefined) {
    child.isActive = isActive;
  }

  await child.save();

  // Get updated child with populated fields
  const updatedChild = await ChildProfile.findById(childId)
    .populate('currentJourney', 'title description order')
    .populate('currentLesson', 'title description order')
    .lean();

  return updatedChild;
};

/**
 * Delete Child Service
 * 
 * Soft deletes (archives) a child profile (only if belongs to parent)
 * 
 * @param {String} childId - Child profile's MongoDB ID
 * @param {String} parentId - Parent's MongoDB ID (for verification)
 * @returns {Object} Deleted child profile
 * @throws {Error} If child not found
 */
const deleteChild = async (childId, parentId) => {
  // Find child and verify it belongs to parent
  const child = await ChildProfile.findOne({
    _id: childId,
    parent: parentId,
  });

  if (!child) {
    throw new Error('Child profile not found or does not belong to you');
  }

  // Soft delete (set isActive to false)
  child.isActive = false;
  await child.save();

  // Get deleted child
  const deletedChild = await ChildProfile.findById(childId)
    .populate('currentJourney', 'title description order')
    .populate('currentLesson', 'title description order')
    .lean();

  return deletedChild;
};

/**
 * Restore Child Service
 * 
 * Restores (reactivates) an archived child profile
 * 
 * @param {String} childId - Child profile's MongoDB ID
 * @param {String} parentId - Parent's MongoDB ID (for verification)
 * @returns {Object} Restored child profile
 * @throws {Error} If child not found
 */
const restoreChild = async (childId, parentId) => {
  // Find child and verify it belongs to parent
  const child = await ChildProfile.findOne({
    _id: childId,
    parent: parentId,
  });

  if (!child) {
    throw new Error('Child profile not found or does not belong to you');
  }

  // Restore (set isActive to true)
  child.isActive = true;
  await child.save();

  // Get restored child
  const restoredChild = await ChildProfile.findById(childId)
    .populate('currentJourney', 'title description order')
    .populate('currentLesson', 'title description order')
    .lean();

  return restoredChild;
};

module.exports = {
  getAllChildren,
  getChildById,
  createChild,
  updateChild,
  deleteChild,
  restoreChild,
  assignDefaultCourses,
};

