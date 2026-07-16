export const STARCAM_MIN_OBJECTS = 4;
export const STARCAM_MAX_OBJECTS = 7;
export const STARCAM_MAX_SORT_ORDER = STARCAM_MAX_OBJECTS - 1;

export function isStarCamObjectCountInRange(count) {
  const n = Number.parseInt(String(count ?? ''), 10);
  return Number.isInteger(n) && n >= STARCAM_MIN_OBJECTS && n <= STARCAM_MAX_OBJECTS;
}

export function starCamObjectCountRangeLabel() {
  return `${STARCAM_MIN_OBJECTS}-${STARCAM_MAX_OBJECTS}`;
}

export function canAddStarCamObject(currentCount) {
  const n = Number.parseInt(String(currentCount ?? ''), 10);
  return Number.isFinite(n) && n < STARCAM_MAX_OBJECTS;
}

export function isVocabIncluded(entry) {
  if (!entry || typeof entry !== 'object') return false;
  return entry.isIncluded !== false;
}

export function countIncludedVocab(vocab = []) {
  return (Array.isArray(vocab) ? vocab : []).filter(isVocabIncluded).length;
}

export function isStarCamMissionPublishReady(vocab = [], hasScanQuestionSet) {
  const includedCount = countIncludedVocab(vocab);
  return isStarCamObjectCountInRange(includedCount) && Boolean(hasScanQuestionSet);
}
