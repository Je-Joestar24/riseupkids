const { User } = require('../models');
const { ChildProfile } = require('../models');

/**
 * Get All Parents Service
 * 
 * Retrieves paginated list of parent users with search and filtering
 * 
 * @param {Object} queryParams - Query parameters
 * @param {Number} queryParams.page - Page number (default: 1)
 * @param {Number} queryParams.limit - Items per page (default: 10)
 * @param {String} queryParams.search - Search term for name/email
 * @param {String} queryParams.isActive - Filter by active status (true/false)
 * @param {String} queryParams.subscriptionStatus - Filter by subscription status
 * @param {String} queryParams.sortBy - Sort field (default: createdAt)
 * @param {String} queryParams.sortOrder - Sort order (asc/desc, default: desc)
 * @returns {Object} Paginated parents data with metadata
 */
const getAllParents = async (queryParams = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    isActive,
    subscriptionStatus,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams;

  // Build query
  const query = { role: 'parent' };

  // Search filter (name or email)
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  // Active status filter
  if (isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }

  // Subscription status filter
  if (subscriptionStatus) {
    query.subscriptionStatus = subscriptionStatus;
  }

  // Calculate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Execute query with pagination
  const [parents, total] = await Promise.all([
    User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(query),
  ]);

  // Get additional data for each parent (child profiles count)
  const parentsWithData = await Promise.all(
    parents.map(async (parent) => {
      const childProfilesCount = await ChildProfile.countDocuments({
        parent: parent._id,
        isActive: true,
      });

      const totalChildren = await ChildProfile.countDocuments({
        parent: parent._id,
      });

      return {
        ...parent,
        childProfilesCount,
        totalChildren,
      };
    })
  );

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limitNum);
  const hasNextPage = pageNum < totalPages;
  const hasPrevPage = pageNum > 1;

  return {
    parents: parentsWithData,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum,
      hasNextPage,
      hasPrevPage,
    },
  };
};

/**
 * Get Single Parent Service
 * 
 * Retrieves a single parent user with all related data
 * 
 * @param {String} parentId - Parent's MongoDB ID
 * @returns {Object} Parent data with child profiles and statistics
 * @throws {Error} If parent not found
 */
const getParentById = async (parentId) => {
  const parent = await User.findById(parentId)
    .select('-password')
    .lean();

  if (!parent) {
    throw new Error('Parent not found');
  }

  if (parent.role !== 'parent') {
    throw new Error('User is not a parent');
  }

  // Get child profiles
  const childProfiles = await ChildProfile.find({
    parent: parentId,
  })
    .select('displayName age avatar currentJourney currentLesson isActive createdAt')
    .populate('currentJourney', 'title description')
    .populate('currentLesson', 'title description')
    .lean();

  // Get statistics
  const activeChildrenCount = await ChildProfile.countDocuments({
    parent: parentId,
    isActive: true,
  });

  const totalChildrenCount = await ChildProfile.countDocuments({
    parent: parentId,
  });

  return {
    ...parent,
    childProfiles,
    statistics: {
      activeChildren: activeChildrenCount,
      totalChildren: totalChildrenCount,
    },
  };
};

/**
 * Create Parent Service
 * 
 * Creates a new parent user account
 * 
 * @param {Object} parentData - Parent registration data
 * @param {String} parentData.name - Parent's full name
 * @param {String} parentData.email - Parent's email address
 * @param {String} parentData.password - Parent's password
 * @returns {Object} Created parent object
 * @throws {Error} If validation fails or user already exists
 */
const createParent = async (parentData) => {
  const { name, email, password } = parentData;

  // Validate required fields
  if (!name || !email || !password) {
    throw new Error('Please provide name, email, and password');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  // Create parent user
  const parent = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: 'parent',
    isActive: true,
  });

  // Get created user (exclude password)
  const createdParent = await User.findById(parent._id).select('-password');

  return createdParent;
};

/**
 * Update Parent Service
 * 
 * Updates parent user information
 * 
 * @param {String} parentId - Parent's MongoDB ID
 * @param {Object} updateData - Data to update
 * @param {String} [updateData.name] - Parent's name
 * @param {String} [updateData.email] - Parent's email
 * @param {Boolean} [updateData.isActive] - Active status
 * @param {String} [updateData.subscriptionStatus] - Subscription status
 * @returns {Object} Updated parent object
 * @throws {Error} If parent not found or validation fails
 */
const updateParent = async (parentId, updateData) => {
  const { name, email, isActive, subscriptionStatus } = updateData;

  // Find parent
  const parent = await User.findById(parentId);

  if (!parent) {
    throw new Error('Parent not found');
  }

  if (parent.role !== 'parent') {
    throw new Error('User is not a parent');
  }

  // Update fields
  if (name !== undefined) {
    parent.name = name;
  }

  if (email !== undefined) {
    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== parentId.toString()) {
      throw new Error('Email already in use');
    }
    parent.email = email.toLowerCase();
  }

  if (isActive !== undefined) {
    parent.isActive = isActive;
  }

  if (subscriptionStatus !== undefined) {
    if (!['active', 'inactive', 'canceled', 'past_due'].includes(subscriptionStatus)) {
      throw new Error('Invalid subscription status');
    }
    parent.subscriptionStatus = subscriptionStatus;
  }

  await parent.save();

  // Get updated parent (exclude password)
  const updatedParent = await User.findById(parentId).select('-password');

  return updatedParent;
};

/**
 * Archive Parent Service
 * 
 * Archives (deactivates) a parent user account
 * 
 * @param {String} parentId - Parent's MongoDB ID
 * @returns {Object} Archived parent object
 * @throws {Error} If parent not found
 */
const archiveParent = async (parentId) => {
  const parent = await User.findById(parentId);

  if (!parent) {
    throw new Error('Parent not found');
  }

  if (parent.role !== 'parent') {
    throw new Error('User is not a parent');
  }

  // Archive parent (set isActive to false)
  parent.isActive = false;
  await parent.save();

  // Also archive all child profiles
  await ChildProfile.updateMany(
    { parent: parentId },
    { isActive: false }
  );

  // Get archived parent (exclude password)
  const archivedParent = await User.findById(parentId).select('-password');

  return archivedParent;
};

/**
 * Restore Parent Service
 * 
 * Restores (reactivates) an archived parent user account
 * 
 * @param {String} parentId - Parent's MongoDB ID
 * @returns {Object} Restored parent object
 * @throws {Error} If parent not found
 */
const restoreParent = async (parentId) => {
  const parent = await User.findById(parentId);

  if (!parent) {
    throw new Error('Parent not found');
  }

  if (parent.role !== 'parent') {
    throw new Error('User is not a parent');
  }

  // Restore parent (set isActive to true)
  parent.isActive = true;
  await parent.save();

  // Get restored parent (exclude password)
  const restoredParent = await User.findById(parentId).select('-password');

  return restoredParent;
};

module.exports = {
  getAllParents,
  getParentById,
  createParent,
  updateParent,
  archiveParent,
  restoreParent,
};

