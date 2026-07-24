/**
 * Client helpers for applying book-completion star rewards quickly and safely.
 * Keeps reward UI independent from module refresh networking.
 */

export type BookCompletionStarApiData = {
  starsToAward?: unknown;
  totalStars?: unknown;
  starsAwarded?: unknown;
  readingCount?: unknown;
  requiredReadingCount?: unknown;
  requirementMet?: unknown;
};

export type ParsedBookCompletionStars = {
  starsToAward: number;
  totalStars: number | undefined;
  starsAwarded: boolean;
  readingCount: number;
  requiredReadingCount: number;
  requirementMet: boolean;
};

/** Normalize completion API payload used for star UI + header sync. */
export function parseBookCompletionStarPayload(
  raw: unknown
): ParsedBookCompletionStars {
  const apiData =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as BookCompletionStarApiData)
      : {};

  return {
    starsToAward: Number(apiData.starsToAward) || 0,
    totalStars:
      apiData.totalStars !== undefined && apiData.totalStars !== null
        ? Number(apiData.totalStars)
        : undefined,
    starsAwarded: Boolean(apiData.starsAwarded),
    readingCount: Number(apiData.readingCount) || 0,
    requiredReadingCount: Number(apiData.requiredReadingCount) || 5,
    requirementMet: Boolean(apiData.requirementMet),
  };
}

/**
 * Run module refresh work without blocking the caller.
 * Errors are logged; they must never undo an already-shown star reward.
 */
export function runBackgroundAfterStarReward(
  task: () => Promise<void>,
  label = 'starReward'
): void {
  void task().catch((error) => {
    console.error(`[${label}] Background work after star reward failed:`, error);
  });
}
