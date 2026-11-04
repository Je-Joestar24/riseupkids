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

const MAX_REMEMBERED_URLS = 300;
const requestedUrls = new Set();
// Held until they finish, so the browser cannot drop a download nobody refers to any more.
const downloading = new Set();

/**
 * Starts downloading pictures into the browser's cache so they appear at once when shown. Only the
 * first `limit` are fetched: fetching all of them together is what made the first load slow. A
 * picture asked for before is not asked for again, and a failure is ignored (it is simply loaded
 * when it is shown).
 */
export function prefetchImages(urls, limit = ABOVE_THE_FOLD_IMAGES) {
  if (typeof Image === 'undefined' || !Array.isArray(urls)) return;
  const list = urls.filter((url) => typeof url === 'string' && url.length > 0).slice(0, limit);

  list.forEach((url) => {
    if (requestedUrls.has(url)) return;
    if (requestedUrls.size >= MAX_REMEMBERED_URLS) requestedUrls.clear();
    requestedUrls.add(url);

    const image = new Image();
    downloading.add(image);
    const finish = () => {
      image.onload = null;
      image.onerror = null;
      downloading.delete(image);
    };
    image.onload = finish;
    image.onerror = () => {
      requestedUrls.delete(url);
      finish();
    };
    image.decoding = 'async';
    image.fetchPriority = 'high';
    image.src = url;
  });
}
