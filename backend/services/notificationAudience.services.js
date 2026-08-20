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
  return User.find(query).select('_id preferredLanguage language isActive role').lean();
}

/**
 * V1 targeting: push/inbox is always a parent user.
 * Children audience still delivers to the parent, with optional childId + child language.
 */
async function listCampaignRecipients(audience, { testUserId } = {}) {
  if (testUserId) {
    const parents = await getParentUsers([testUserId]);
    const adminFallback = parents.length
      ? parents
      : await User.find({ _id: testUserId }).select('_id preferredLanguage language isActive role').lean();
    const user = adminFallback[0];
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
    };
  });
}

module.exports = {
  listCampaignRecipients,
  recipientLanguage,
};
