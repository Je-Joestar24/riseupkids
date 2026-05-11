/**
 * Star Cam category "active" rules shared by admin, child, and seeders.
 * Prefer **in-memory checks** after a plain `find({})` / `findById` for listing,
 * so odd BSON (imports, legacy types) cannot make Mongo filters return zero rows.
 */

function isStarCamCategoryExplicitlyInactive(doc) {
  if (!doc || typeof doc !== 'object') return false;
  const v = doc.isActive;
  return v === false || v === 'false' || v === 0 || v === '0';
}

function isStarCamCategoryActiveDoc(doc) {
  return !isStarCamCategoryExplicitlyInactive(doc);
}

/** @deprecated Prefer find({}) + filter with isStarCamCategoryActiveDoc; kept for narrow queries if needed */
function starCamCategoryActiveMatch() {
  return {
    $nor: [{ isActive: false }, { isActive: 'false' }, { isActive: 0 }, { isActive: '0' }],
  };
}

module.exports = {
  isStarCamCategoryExplicitlyInactive,
  isStarCamCategoryActiveDoc,
  starCamCategoryActiveMatch,
};
