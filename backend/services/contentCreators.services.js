const { User } = require('../models');
const { CONTENT_CREATOR_ROLE } = require('../utils/contentOwnership');

/**
 * Content creator accounts are stored in the User collection with role = 'content_creator'.
 * IMPORTANT: Content creator accounts can only be created by an admin.
 */

const getAllContentCreators = async (queryParams = {}) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = queryParams;

  const query = { role: CONTENT_CREATOR_ROLE };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true' || isActive === true;
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [contentCreators, total] = await Promise.all([
    User.find(query).select('-password').sort(sort).skip(skip).limit(limitNum).lean(),
    User.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    contentCreators,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalItems: total,
      itemsPerPage: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

const getContentCreatorById = async (contentCreatorId) => {
  const contentCreator = await User.findById(contentCreatorId).select('-password').lean();

  if (!contentCreator) {
    throw new Error('Content creator not found');
  }

  if (contentCreator.role !== CONTENT_CREATOR_ROLE) {
    throw new Error('User is not a content creator');
  }

  return contentCreator;
};

const createContentCreator = async (contentCreatorData) => {
  const { name, email, password } = contentCreatorData;

  if (!name || !email || !password) {
    throw new Error('Please provide name, email, and password');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  const contentCreator = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role: CONTENT_CREATOR_ROLE,
    isActive: true,
  });

  return await User.findById(contentCreator._id).select('-password');
};

const updateContentCreator = async (contentCreatorId, updateData) => {
  const { name, email, isActive, password } = updateData;

  const contentCreator = await User.findById(contentCreatorId);
  if (!contentCreator) {
    throw new Error('Content creator not found');
  }

  if (contentCreator.role !== CONTENT_CREATOR_ROLE) {
    throw new Error('User is not a content creator');
  }

  if (name !== undefined) {
    contentCreator.name = name;
  }

  if (email !== undefined) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser._id.toString() !== contentCreatorId.toString()) {
      throw new Error('Email already in use');
    }
    contentCreator.email = email.toLowerCase();
  }

  if (isActive !== undefined) {
    contentCreator.isActive = isActive;
  }

  if (password !== undefined && password !== '') {
    contentCreator.password = password;
  }

  await contentCreator.save();

  return await User.findById(contentCreatorId).select('-password');
};

const archiveContentCreator = async (contentCreatorId) => {
  const contentCreator = await User.findById(contentCreatorId);
  if (!contentCreator) {
    throw new Error('Content creator not found');
  }

  if (contentCreator.role !== CONTENT_CREATOR_ROLE) {
    throw new Error('User is not a content creator');
  }

  contentCreator.isActive = false;
  await contentCreator.save();

  return await User.findById(contentCreatorId).select('-password');
};

const restoreContentCreator = async (contentCreatorId) => {
  const contentCreator = await User.findById(contentCreatorId);
  if (!contentCreator) {
    throw new Error('Content creator not found');
  }

  if (contentCreator.role !== CONTENT_CREATOR_ROLE) {
    throw new Error('User is not a content creator');
  }

  contentCreator.isActive = true;
  await contentCreator.save();

  return await User.findById(contentCreatorId).select('-password');
};

module.exports = {
  CONTENT_CREATOR_ROLE,
  getAllContentCreators,
  getContentCreatorById,
  createContentCreator,
  updateContentCreator,
  archiveContentCreator,
  restoreContentCreator,
};
