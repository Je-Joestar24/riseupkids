const { ChildProfile } = require('../models');

const CONSENT_REQUIRED_ERROR =
  'Parent consent acknowledgment is required to enable Kids Wall';
const NOT_ENABLED_ERROR =
  'Kids Wall sharing is off for this child. A parent can turn it on in account settings.';

async function getChildForParent(childId, parentId) {
  const child = await ChildProfile.findOne({ _id: childId, parent: parentId });
  if (!child) {
    throw new Error('Child profile not found or does not belong to you');
  }
  return child;
}

/**
 * RUK-SEC-006 — Kids Wall is opt-in. A child may only share/appear on Kids Wall when a parent
 * has explicitly turned it on for that child (`kidsWallEnabled === true`) AND that action left a
 * real consent timestamp (`kidsWallConsentAt`). `kidsWallEnabled` alone is not sufficient — a
 * bare boolean can be defaulted or bulk-set without an actual parent action.
 */
function hasKidsWallConsent(child) {
  return child?.kidsWallEnabled === true && Boolean(child?.kidsWallConsentAt);
}

async function assertKidsWallEnabled(childId) {
  const child = await ChildProfile.findById(childId).select(
    'kidsWallEnabled kidsWallConsentAt isActive displayName'
  );

  if (!child || !child.isActive) {
    throw new Error('Child profile not found');
  }

  if (!hasKidsWallConsent(child)) {
    throw new Error(NOT_ENABLED_ERROR);
  }

  return child;
}

/**
 * Allow or block Kids Wall posting for a child (parent only). Kids Wall is off by default;
 * a parent must explicitly turn it on per child. Turning it on records the timestamp and the
 * request IP alongside the parent (`child.parent`) as the consent record; turning it off clears
 * the grant but keeps the historical consent timestamp/IP for reference.
 */
async function updateKidsWallConsent(childId, parentId, { enabled }, meta = {}) {
  if (typeof enabled !== 'boolean') {
    throw new Error('enabled must be true or false');
  }

  const child = await getChildForParent(childId, parentId);

  if (enabled) {
    child.kidsWallEnabled = true;
    child.kidsWallConsentAt = new Date();
    if (meta.ip) child.kidsWallConsentIp = meta.ip;
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
  hasKidsWallConsent,
  assertKidsWallEnabled,
  updateKidsWallConsent,
};
