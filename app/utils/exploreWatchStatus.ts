import type { ExploreWatchStatus } from '@/services/exploreService';

/** True when this explore video was watched before (any prior watch or stars). */
export function isExploreContentAlreadyWatched(
  status: ExploreWatchStatus | null | undefined
): boolean {
  if (!status) return false;
  return (status.currentWatchCount ?? 0) > 0 || Boolean(status.starsAwarded);
}
