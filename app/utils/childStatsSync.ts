/**
 * Local child star total helpers for the mobile app.
 * Updates Zustand exploreStore without refetching the header stats API.
 */

export interface StarRewardInput {
  starsToAward?: number;
  totalStars?: number | null;
}

export function resolveNextChildTotalStars(
  currentTotal: number,
  { starsToAward = 0, totalStars }: StarRewardInput = {}
): number | null {
  const earnedThisSession = Number(starsToAward) || 0;
  const hasApiTotal = totalStars !== undefined && totalStars !== null;

  if (earnedThisSession <= 0 && !hasApiTotal) {
    return null;
  }

  if (hasApiTotal) {
    return Number(totalStars) || 0;
  }

  return currentTotal + earnedThisSession;
}
