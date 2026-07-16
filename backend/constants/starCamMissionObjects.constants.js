/** Minimum scavenger / practice objects per published Star Cam mission. */
const STARCAM_MIN_OBJECTS = 4;

/** Maximum scavenger / practice objects per published Star Cam mission. */
const STARCAM_MAX_OBJECTS = 7;

/** Highest allowed sortOrder index (0-based). */
const STARCAM_MAX_SORT_ORDER = STARCAM_MAX_OBJECTS - 1;

function normalizeStarCamObjectCount(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : NaN;
}

function isStarCamObjectCountInRange(count) {
  const n = normalizeStarCamObjectCount(count);
  return Number.isInteger(n) && n >= STARCAM_MIN_OBJECTS && n <= STARCAM_MAX_OBJECTS;
}

function assertStarCamObjectCountInRange(count, label = 'objects') {
  if (!isStarCamObjectCountInRange(count)) {
    const err = new Error(
      `${label} count must be between ${STARCAM_MIN_OBJECTS} and ${STARCAM_MAX_OBJECTS} (received ${count})`
    );
    err.statusCode = 400;
    throw err;
  }
}

function starCamObjectCountRangeLabel() {
  return `${STARCAM_MIN_OBJECTS}-${STARCAM_MAX_OBJECTS}`;
}

module.exports = {
  STARCAM_MIN_OBJECTS,
  STARCAM_MAX_OBJECTS,
  STARCAM_MAX_SORT_ORDER,
  normalizeStarCamObjectCount,
  isStarCamObjectCountInRange,
  assertStarCamObjectCountInRange,
  starCamObjectCountRangeLabel,
};
