const {
  STARCAM_MIN_OBJECTS,
  STARCAM_MAX_OBJECTS,
  isStarCamObjectCountInRange,
  assertStarCamObjectCountInRange,
} = require('../constants/starCamMissionObjects.constants');

function isVocabIncluded(entry) {
  if (!entry || typeof entry !== 'object') return false;
  return entry.isIncluded !== false;
}

function filterIncludedVocab(vocab = []) {
  return (vocab || []).filter(isVocabIncluded);
}

function countIncludedVocab(vocab = []) {
  return filterIncludedVocab(vocab).length;
}

function assertIncludedVocabCountInRange(vocab, label = 'included vocabulary') {
  assertStarCamObjectCountInRange(countIncludedVocab(vocab), label);
}

function sortVocabByOrder(vocab = []) {
  return (vocab || [])
    .slice()
    .sort((a, b) => Number(a?.sortOrder ?? 0) - Number(b?.sortOrder ?? 0));
}

function canToggleVocabInclusion(vocab = [], sortOrder, nextIncluded) {
  const numericSortOrder = Number(sortOrder);
  const entry = (vocab || []).find((v) => Number(v?.sortOrder) === numericSortOrder);
  if (!entry) {
    return { allowed: false, reason: 'Mission vocabulary not found' };
  }

  const currentlyIncluded = isVocabIncluded(entry);
  const next = Boolean(nextIncluded);
  if (currentlyIncluded === next) {
    return { allowed: true, noChange: true };
  }

  const includedCount = countIncludedVocab(vocab);
  if (next && includedCount >= STARCAM_MAX_OBJECTS) {
    return { allowed: false, reason: `A mission can include at most ${STARCAM_MAX_OBJECTS} objects` };
  }
  if (!next && includedCount <= STARCAM_MIN_OBJECTS) {
    return {
      allowed: false,
      reason: `A mission must keep at least ${STARCAM_MIN_OBJECTS} included objects`,
    };
  }

  return { allowed: true, noChange: false };
}

module.exports = {
  STARCAM_MIN_OBJECTS,
  STARCAM_MAX_OBJECTS,
  isStarCamObjectCountInRange,
  isVocabIncluded,
  filterIncludedVocab,
  countIncludedVocab,
  assertIncludedVocabCountInRange,
  sortVocabByOrder,
  canToggleVocabInclusion,
};
