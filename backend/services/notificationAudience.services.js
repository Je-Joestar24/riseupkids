const { User, ChildProfile } = require('../models');
const { normalizeLanguageCode } = require('../config/notificationCatalog');

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function asId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return String(value._id);
  return String(value);
}

function recipientLanguage({ user, child }) {
  return (
    normalizeLanguageCode(child?.preferences?.language) ||
    normalizeLanguageCode(user?.preferredLanguage) ||
    normalizeLanguageCode(user?.language) ||
    'en'
  );
}

async function getParentUsers(userIds) {
  const query = { role: 'parent', isActive: { $ne: false } };
  if (userIds?.length) {
    query._id = { $in: userIds };
  }
  return User.find(query).select('_id preferredLanguage language isActive role timezone').lean();
}

const TEST_USER_SELECT = '_id preferredLanguage language isActive role timezone';

async function loadUserById(id) {
  if (!id) return null;
  try {
    return await User.findById(id).select(TEST_USER_SELECT).lean();
  } catch {
    return null;
  }
}

/**
 * Admin test id may be a parent User or a ChildProfile. Push always targets the parent.
 */
async function resolveTestParentUser(testUserId) {
  const user = await loadUserById(testUserId);
  if (user) return user;

  let child = null;
  try {
    child = await ChildProfile.findById(testUserId).select('_id parent preferences').lean();
  } catch {
    child = null;
  }
  if (!child?.parent) return null;
  return loadUserById(child.parent);
}

/**
 * V1 targeting: push/inbox is always a parent user.
 * Children audience still delivers to the parent, with optional childId + child language.
 */
async function listCampaignRecipients(audience, { testUserId } = {}) {
  if (testUserId) {
    const user = await resolveTestParentUser(testUserId);
    if (!user) {
      throw httpError('Test user not found', 404);
    }
    const children = await ChildProfile.find({ parent: user._id }).select('_id parent preferences').lean();
    const child = children[0] || null;
    return [
      {
        userId: asId(user._id),
        childId: audience === 'children' ? asId(child?._id) : null,
        preferredLanguage: recipientLanguage({ user, child }),
        timezone: user.timezone || null,
      },
    ];
  }

  const parents = await getParentUsers();
  if (!parents.length) return [];

  const children = await ChildProfile.find({ parent: { $in: parents.map((row) => row._id) } })
    .select('_id parent preferences')
    .lean();
  const childrenByParent = new Map();
  children.forEach((child) => {
    const parentId = asId(child.parent);
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(child);
  });

  return parents.map((user) => {
    const parentId = asId(user._id);
    const family = childrenByParent.get(parentId) || [];
    const child = family[0] || null;
    return {
      userId: parentId,
      childId: audience === 'children' ? asId(child?._id) : null,
      preferredLanguage: recipientLanguage({ user, child }),
      timezone: user.timezone || null,
    };
  });
}

module.exports = {
  listCampaignRecipients,
  recipientLanguage,
  resolveTestParentUser,
};
