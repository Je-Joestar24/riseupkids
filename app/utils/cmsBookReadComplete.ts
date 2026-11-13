/**
 * When does a built-in (CMS) book count as read? Only when the child has got to its LAST page. Closing the book
 * earlier (the X on page 1, say) earns nothing, however the interactive pages went.
 *
 * On top of that the old rule still holds: at least 75% of the interactive pages right, or full marks, or no
 * interactive pages at all, or the home button (which only appears on the last page).
 */

/** True once the furthest page the child has been on is the last one (a book with no pages never counts). */
export function reachedLastPage(furthestIndex: number, totalPages: number): boolean {
  return totalPages > 0 && furthestIndex >= totalPages - 1;
}

export interface BookReadSession {
  /** The child got to the last page. */
  reachedEnd: boolean;
  score: number;
  maxScore: number;
  /** How the player was left: the X, or the home button on the last page. */
  trigger: 'close' | 'home';
}

/** Whether to tell the server this book was read (and so ask for stars). */
export function shouldSubmitBookRead({ reachedEnd, score, maxScore, trigger }: BookReadSession): boolean {
  if (!reachedEnd) return false;
  const max = Math.max(0, maxScore);
  const got = Math.min(score, max > 0 ? max : score);
  const ratio = max > 0 ? got / max : 1;
  return ratio >= 0.75 || (max > 0 && got >= max) || max === 0 || trigger === 'home';
}
