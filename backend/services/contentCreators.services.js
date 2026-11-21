const { User } = require('../models');
const logger = require('../config/logger');
const { CONTENT_CREATOR_ROLE } = require('../utils/contentOwnership');
const { effectiveAreas, describeAccessAreas, LEGACY_CREATOR_AREAS } = require('../utils/accessAreas');
const {
  ContentCreatorNotFoundError,
  assertValidAreas,
  bulkRequestError,
} = require('../utils/accessErrors');

/**
 * Content creator accounts are stored in the User collection with role = 'content_creator'.
 * IMPORTANT: Content creator accounts can only be created by an admin.
 *
 * Access areas (docs/CONTENT_CREATOR_ACCESS_CONTROL_PLAN.md): each creator has a list of the parts of the site she can
 * use. An admin sets it when creating her and can change it later. A creator without a saved list (every creator from
 * before this feature) is treated as having the legacy set, so nothing changes for her until an admin changes it.
 */

const MAX_BULK_CREATORS = 100;

// Strictly 24 hex characters. (mongoose.isValidObjectId also accepts any 12-character text, which is not an id here.)
const isObjectIdString = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

/**
 * `.lean()` results skip the model's JSON output, so the effective access list is added here. The admin always sees
 * what the creator can really use right now, never an empty field.
 */
const withEffectiveAreas = (creator) => (creator ? { ...creator, accessAreas: effectiveAreas(creator) } : creator);

const sameList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

/** One line in the server log for every change of someone's access: who changed whose access, from what to what. */
const logAccessChange = ({ actorId, creatorId, before, after }) => {
  logger.info(
    {
      event: 'content_creator_access_changed',
      actorId: actorId ? String(actorId) : null,
      creatorId: String(creatorId),
      before,
      after,
      added: after.filter((area) => !before.includes(area)),
      removed: before.filter((area) => !after.includes(area)),
    },
    '[access] content creator access changed'
  );
};

/** Loads a creator as a document, or throws the 404 (not found, or not a content creator). */
const loadCreatorDocument = async (creatorId) => {
  if (!isObjectIdString(creatorId)) {
    throw new ContentCreatorNotFoundError();
  }
  const creator = await User.findById(creatorId);
  if (!creator || creator.role !== CONTENT_CREATOR_ROLE) {
    throw new ContentCreatorNotFoundError();
  }
  return creator;
};

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
    contentCreators: contentCreators.map(withEffectiveAreas),
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
    throw new ContentCreatorNotFoundError('Content creator not found');
  }

  if (contentCreator.role !== CONTENT_CREATOR_ROLE) {
    throw new ContentCreatorNotFoundError('User is not a content creator');
  }

  return withEffectiveAreas(contentCreator);
};

/**
 * @param {Object} contentCreatorData { name, email, password, accessAreas }  accessAreas is required
 * @param {Object} [options] { actorId } the admin creating the account (kept as who set the access)
 */
const createContentCreator = async (contentCreatorData, { actorId = null } = {}) => {
  const { name, email, password } = contentCreatorData;

  if (!name || !email || !password) {
    throw new Error('Please provide name, email, and password');
  }

  // Before anything is looked up or written: a bad list must never leave a half-made account behind.
  const accessAreas = assertValidAreas(contentCreatorData.accessAreas);

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
    accessAreas,
    accessUpdatedAt: new Date(),
    accessUpdatedBy: actorId || null,
  });

  logAccessChange({ actorId, creatorId: contentCreator._id, before: [], after: accessAreas });

  return await User.findById(contentCreator._id).select('-password');
};

/**
 * @param {Object} updateData name, email, isActive, password, and (optional) accessAreas
 * @param {Object} [options] { actorId } the admin making the change
 */
const updateContentCreator = async (contentCreatorId, updateData, { actorId = null } = {}) => {
  const { name, email, isActive, password } = updateData;

  // `accessAreas: undefined` means "leave it alone"; anything else (even null or []) is checked, so a bad value is
  // refused instead of being ignored. Checked before any change is made.
  const accessAreas = updateData.accessAreas === undefined ? undefined : assertValidAreas(updateData.accessAreas);

  const contentCreator = await User.findById(contentCreatorId);
  if (!contentCreator) {
    throw new ContentCreatorNotFoundError('Content creator not found');
  }

  if (contentCreator.role !== CONTENT_CREATOR_ROLE) {
    throw new ContentCreatorNotFoundError('User is not a content creator');
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

  let accessChange = null;
  if (accessAreas !== undefined) {
    const before = effectiveAreas(contentCreator);
    contentCreator.accessAreas = accessAreas;
    contentCreator.accessUpdatedAt = new Date();
    contentCreator.accessUpdatedBy = actorId || null;
    accessChange = { before, after: accessAreas };
  }

  await contentCreator.save();

  if (accessChange && !sameList(accessChange.before, accessChange.after)) {
    logAccessChange({ actorId, creatorId: contentCreatorId, ...accessChange });
  }

  return await User.findById(contentCreatorId).select('-password');
};

/**
 * Manage access: replaces one creator's access list, and nothing else about her.
 * The change takes effect on her very next request. She is not logged out, her password and her content are untouched.
 *
 * @param {string} contentCreatorId
 * @param {*} accessAreasInput the list sent by the admin (validated here)
 * @param {Object} [options] { actorId } the admin making the change
 * @returns {Promise<{ creator: Object, previousAccessAreas: string[], changed: boolean }>}
 */
const setContentCreatorAccess = async (contentCreatorId, accessAreasInput, { actorId = null } = {}) => {
  const accessAreas = assertValidAreas(accessAreasInput);
  const creator = await loadCreatorDocument(contentCreatorId);

  const before = effectiveAreas(creator);
  creator.accessAreas = accessAreas;
  creator.accessUpdatedAt = new Date();
  creator.accessUpdatedBy = actorId || null;
  await creator.save();

  const changed = !sameList(before, accessAreas);
  if (changed) {
    logAccessChange({ actorId, creatorId: creator._id, before, after: accessAreas });
  }

  return {
    creator: await User.findById(creator._id).select('-password'),
    previousAccessAreas: before,
    changed,
  };
};

/**
 * Bulk manage access: gives several creators the same list. Everything is checked BEFORE anything is written:
 * one bad id, or one person who is not a content creator, changes nobody.
 *
 * @param {*} ids array of creator ids
 * @param {*} accessAreasInput the list to give them all (validated here)
 * @param {Object} [options] { actorId } the admin making the change
 * @returns {Promise<{ matched: number, changed: number, results: Array<{ id: string, name: string, previousAccessAreas: string[], accessAreas: string[], changed: boolean }> }>}
 */
const setContentCreatorAccessBulk = async (ids, accessAreasInput, { actorId = null } = {}) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw bulkRequestError('Choose at least one person.');
  }
  if (ids.length > MAX_BULK_CREATORS) {
    throw bulkRequestError(`Choose at most ${MAX_BULK_CREATORS} people at a time.`);
  }
  if (ids.some((id) => !isObjectIdString(id))) {
    throw bulkRequestError('One of the people chosen is not valid.');
  }

  const accessAreas = assertValidAreas(accessAreasInput);
  const uniqueIds = [...new Set(ids)];

  const found = await User.find({ _id: { $in: uniqueIds } }).select('name role accessAreas');
  const foundIds = new Set(found.map((user) => String(user._id)));
  const missing = uniqueIds.filter((id) => !foundIds.has(id));
  const notCreators = found.filter((user) => user.role !== CONTENT_CREATOR_ROLE);
  if (missing.length > 0 || notCreators.length > 0) {
    const offending = [...missing, ...notCreators.map((user) => String(user._id))];
    throw bulkRequestError(`These are not content creators, so nothing was changed: ${offending.join(', ')}`);
  }

  const now = new Date();
  const outcome = await User.updateMany(
    { _id: { $in: uniqueIds }, role: CONTENT_CREATOR_ROLE },
    { $set: { accessAreas, accessUpdatedAt: now, accessUpdatedBy: actorId || null } }
  );

  const results = found.map((user) => {
    const before = effectiveAreas(user);
    const changed = !sameList(before, accessAreas);
    if (changed) {
      logAccessChange({ actorId, creatorId: user._id, before, after: accessAreas });
    }
    return {
      id: String(user._id),
      name: user.name,
      previousAccessAreas: before,
      accessAreas,
      changed,
    };
  });

  return {
    matched: outcome.matchedCount ?? results.length,
    changed: results.filter((result) => result.changed).length,
    results,
  };
};

/** What the admin form draws: the checkboxes, and which of them a current creator has today. */
const getAccessAreaOptions = () => ({
  areas: describeAccessAreas(),
  legacyAreas: [...LEGACY_CREATOR_AREAS],
});

const archiveContentCreator = async (contentCreatorId) => {
  const contentCreator = await User.findById(contentCreatorId);
  if (!contentCreator) {
    throw new ContentCreatorNotFoundError('Content creator not found');
  }

  if (contentCreator.role !== CONTENT_CREATOR_ROLE) {
    throw new ContentCreatorNotFoundError('User is not a content creator');
  }

  contentCreator.isActive = false;
  await contentCreator.save();

  return await User.findById(contentCreatorId).select('-password');
};

const restoreContentCreator = async (contentCreatorId) => {
  const contentCreator = await User.findById(contentCreatorId);
  if (!contentCreator) {
    throw new ContentCreatorNotFoundError('Content creator not found');
  }

  if (contentCreator.role !== CONTENT_CREATOR_ROLE) {
    throw new ContentCreatorNotFoundError('User is not a content creator');
  }

  contentCreator.isActive = true;
  await contentCreator.save();

  return await User.findById(contentCreatorId).select('-password');
};

module.exports = {
  CONTENT_CREATOR_ROLE,
  MAX_BULK_CREATORS,
  getAllContentCreators,
  getContentCreatorById,
  createContentCreator,
  updateContentCreator,
  setContentCreatorAccess,
  setContentCreatorAccessBulk,
  getAccessAreaOptions,
  archiveContentCreator,
  restoreContentCreator,
};
