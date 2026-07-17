const { ChildProfile } = require('../models');

const CONSENT_REQUIRED_ERROR =
  'Parent consent acknowledgment is required to enable Kids Wall';
const NOT_ENABLED_ERROR =
  'Kids Wall sharing is blocked for this child. A parent can allow it in account settings.';

async function getChildForParent(childId, parentId) {
  const child = await ChildProfile.findOne({ _id: childId, parent: parentId });
  if (!child) {
    throw new Error('Child profile not found or does not belong to you');
  }
  return child;
}

function isKidsWallEnabled(child) {
  return child?.kidsWallEnabled !== false;
}

async function assertKidsWallEnabled(childId) {
  const child = await ChildProfile.findById(childId).select(
    'kidsWallEnabled isActive displayName'
  );

  if (!child || !child.isActive) {
    throw new Error('Child profile not found');
  }

  if (!isKidsWallEnabled(child)) {
    throw new Error(NOT_ENABLED_ERROR);
  }

  return child;
}

/**
 * Allow or block Kids Wall posting for a child (parent only).
 * Kids Wall is allowed by default; parents can block sharing per child.
 */
async function updateKidsWallConsent(childId, parentId, { enabled }) {
  if (typeof enabled !== 'boolean') {
    throw new Error('enabled must be true or false');
  }

  const child = await getChildForParent(childId, parentId);

  if (enabled) {
    child.kidsWallEnabled = true;
    child.kidsWallConsentAt = new Date();
  } else {
    child.kidsWallEnabled = false;
  }

  await child.save();

  return {
    _id: child._id,
    displayName: child.displayName,
    kidsWallEnabled: child.kidsWallEnabled,
    kidsWallConsentAt: child.kidsWallConsentAt,
  };
}

module.exports = {
  CONSENT_REQUIRED_ERROR,
  NOT_ENABLED_ERROR,
  isKidsWallEnabled,
  assertKidsWallEnabled,
  updateKidsWallConsent,
};
