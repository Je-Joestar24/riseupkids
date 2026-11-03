/**
 * Loading plan for remote pictures (course covers, video/book/chant/audio thumbnails, post photos).
 *
 * The pictures come from the backend, which can be slow, and a page used to ask for every one of
 * them at the same moment — they competed with each other and with the page's own data. Now the
 * first few (the ones on screen without scrolling) load right away with high priority, and the rest
 * start a little later one after another with low priority. Same numbers as the app.
 */

/** How many pictures at the top of a page load immediately. */
export const ABOVE_THE_FOLD_IMAGES = 4;
const STAGGER_STEP_MS = 150;
const MAX_DELAY_MS = 1500;

/** When and how urgently the picture at `index` (0 = first on the page) should load. */
export function imageLoadPlan(index) {
  const position = Number.isFinite(index) && index > 0 ? Math.floor(index) : 0;
  if (position < ABOVE_THE_FOLD_IMAGES) return { delayMs: 0, priority: 'high' };
  return {
    delayMs: Math.min(MAX_DELAY_MS, (position - ABOVE_THE_FOLD_IMAGES + 1) * STAGGER_STEP_MS),
    priority: 'low',
  };
}
