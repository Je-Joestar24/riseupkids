/**
 * Fit 5 reading/watch progress circles inside a 2-column module card.
 * iPhone SE (~320pt) cards are too narrow for a fixed 28pt circle + gap.
 */

export const MODULE_PROGRESS_CIRCLE_COUNT = 5;
export const MODULE_PROGRESS_CIRCLE_GAP = 4;
export const MODULE_PROGRESS_CIRCLE_MIN = 14;
export const MODULE_PROGRESS_CIRCLE_MAX = 22;

export function getModuleProgressCircleSize(
  rowWidth: number,
  options?: {
    count?: number;
    gap?: number;
    min?: number;
    max?: number;
  }
): number {
  const count = options?.count ?? MODULE_PROGRESS_CIRCLE_COUNT;
  const gap = options?.gap ?? MODULE_PROGRESS_CIRCLE_GAP;
  const min = options?.min ?? MODULE_PROGRESS_CIRCLE_MIN;
  const max = options?.max ?? MODULE_PROGRESS_CIRCLE_MAX;
  if (!(rowWidth > 0) || count < 1) return max;
  const size = Math.floor((rowWidth - gap * (count - 1)) / count);
  return Math.max(min, Math.min(max, size));
}
