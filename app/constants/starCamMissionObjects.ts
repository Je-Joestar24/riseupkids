export const STARCAM_MIN_OBJECTS = 4;
export const STARCAM_MAX_OBJECTS = 7;
export const STARCAM_MAX_SORT_ORDER = STARCAM_MAX_OBJECTS - 1;

export function isStarCamObjectCountInRange(count: number): boolean {
  const n = Number.parseInt(String(count ?? ''), 10);
  return Number.isInteger(n) && n >= STARCAM_MIN_OBJECTS && n <= STARCAM_MAX_OBJECTS;
}

export function resolveStarCamTotalObjects(
  huntItems: unknown[] | null | undefined,
  flowObjectCount?: number | null
): number {
  if (Array.isArray(huntItems) && huntItems.length > 0) {
    return huntItems.length;
  }
  if (typeof flowObjectCount === 'number' && flowObjectCount > 0) {
    return flowObjectCount;
  }
  return STARCAM_MAX_OBJECTS;
}

export function buildStarCamSuccessSubtitle(objectCount: number): string {
  const count = Number.isFinite(objectCount) && objectCount > 0 ? objectCount : STARCAM_MAX_OBJECTS;
  return `You found all ${count} objects!`;
}
