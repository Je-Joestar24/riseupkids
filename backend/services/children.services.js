const { ChildProfile, Journey, Lesson } = require('../models');

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

  return children;
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

  return child;
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

  // Get created child with populated fields
  const createdChild = await ChildProfile.findById(child._id)
    .populate('currentJourney', 'title description order')
    .populate('currentLesson', 'title description order')
    .lean();

  return createdChild;
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
};

