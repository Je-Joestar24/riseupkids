import { preloadImage as defaultPreloadImage } from './cmsPlayerMedia';
import { compareCmsAssetPriority, getCmsPageBand } from './cmsBookMediaPlan';

/**
 * Downloads a built-in book's media for real, nearest page first, and hands the players a local copy.
 *
 * - Sound and video are fetched whole and kept as an in-memory file (a `blob:` address), so a page plays
 *   from memory instead of asking the internet again. Pictures are loaded and decoded ahead (the browser keeps them).
 * - Files wait in a queue ordered by how soon the child can reach their page; `setFocus` re-orders it when the child
 *   moves. Small files run several at a time, videos one at a time (plus one more when the next page needs a video
 *   and a far-away one is still on its way), so a big video never starves the page in front of the child.
 * - Nothing here can leave a child stuck: a file that is an embed, is too big to hold, cannot be downloaded
 *   (blocked by the server, offline, stalled, an error) is simply played from its original address, and counts
 *   as "settled" for the page that needs it.
 * - `cancel()` stops every download and frees every local copy.
 *
 * It does not touch React; the hook around it does.
 */

export const MEDIA_STATE = Object.freeze({
  PENDING: 'pending',
  LOADING: 'loading',
  READY: 'ready', // a local copy exists (or, for a picture, it has been loaded)
  STREAM: 'stream', // deliberately not copied: an embed, or too big to hold
  FAILED: 'failed', // could not be fetched; played from the internet
});

const SETTLED = new Set([MEDIA_STATE.READY, MEDIA_STATE.STREAM, MEDIA_STATE.FAILED]);
const MB = 1024 * 1024;

export const CMS_MEDIA_LIMITS = Object.freeze({
  smallConcurrency: 6,
  videoConcurrency: 1,
  maxFileBytes: 100 * MB,
  maxTotalBytes: 400 * MB,
  stallTimeoutMs: 30000,
  retries: 1,
  retryDelayMs: 1500,
  // How long to wait for the device's saved copy before going to the internet instead.
  storeReadTimeoutMs: 4000,
});

/**
 * @param {{
 *   plan: ReturnType<import('./cmsBookMediaPlan').buildCmsBookMediaPlan>,
 *   pages?: object[],
 *   fetchImpl?: typeof fetch,
 *   preloadImage?: (url: string) => Promise<void>,
 *   createObjectURL?: (blob: Blob) => string,
 *   revokeObjectURL?: (url: string) => void,
 *   store?: ReturnType<import('./cmsBookMediaStore').createCmsBookMediaStore>,
 * } & Partial<typeof CMS_MEDIA_LIMITS>} options
 */
export const createCmsBookMediaLoader = (options = {}) => {
  const {
    plan = { assets: [], pageUrls: [] },
    pages = [],
    fetchImpl = (...args) => globalThis.fetch(...args),
    preloadImage = defaultPreloadImage,
    createObjectURL = (blob) => URL.createObjectURL(blob),
    revokeObjectURL = (url) => URL.revokeObjectURL(url),
    store = null,
  } = options;
  // Only a book we can name, with files we can date, is kept between visits.
  const keepsBetweenVisits = Boolean(store && store.available !== false && plan.bookId);
  const limits = { ...CMS_MEDIA_LIMITS };
  Object.keys(CMS_MEDIA_LIMITS).forEach((name) => {
    if (typeof options[name] === 'number') limits[name] = options[name];
  });

  const entries = new Map();
  plan.assets.forEach((asset) => {
    entries.set(asset.url, {
      ...asset,
      state: asset.streamOnly ? MEDIA_STATE.STREAM : MEDIA_STATE.PENDING,
      reason: asset.streamOnly ? 'embed' : null,
      // What makes a saved copy still the right one: the file's own change date, else the book's version.
      stamp: asset.updatedAt ? String(asset.updatedAt) : plan.contentVersion ? String(plan.contentVersion) : '',
      fromStore: false,
      src: null,
      attempts: 0,
      waiting: false, // between a failed try and the next one
      controller: null,
    });
  });

  const listeners = new Set();
  const retryTimers = new Set();
  let focus = 0;
  let started = false;
  let cancelled = false;
  let heldBytes = 0;
  let snapshot = { version: 0 };

  const emit = () => {
    snapshot = { version: snapshot.version + 1 };
    listeners.forEach((listener) => listener());
  };

  const settle = (entry, state, extra = {}) => {
    entry.state = state;
    entry.controller = null;
    Object.assign(entry, extra);
    emit();
    pump();
  };

  const readBody = async (response, controller, onChunk) => {
    const chunks = [];
    let received = 0;
    const tooBig = () => received > limits.maxFileBytes || heldBytes + received > limits.maxTotalBytes;
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength ?? value.length ?? 0;
        onChunk();
        if (tooBig()) {
          controller.abort();
          return { tooBig: true };
        }
      }
    } else {
      const blob = await response.blob();
      received = blob.size;
      if (tooBig()) return { tooBig: true };
      return { blob };
    }
    return { blob: new Blob(chunks, { type: response.headers?.get?.('content-type') || '' }) };
  };

  /** Fetch one sound or video whole. Resolves { blob } or { tooBig }, or throws. */
  const downloadFile = async (entry) => {
    const controller = new AbortController();
    entry.controller = controller;
    let stallTimer = null;
    const watchStall = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => controller.abort(), limits.stallTimeoutMs);
    };
    try {
      watchStall();
      const response = await fetchImpl(entry.url, { mode: 'cors', credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const declared = Number(response.headers?.get?.('content-length')) || 0;
      if (declared > limits.maxFileBytes || (declared && heldBytes + declared > limits.maxTotalBytes)) {
        controller.abort();
        return { tooBig: true };
      }
      return await readBody(response, controller, watchStall);
    } finally {
      clearTimeout(stallTimer);
    }
  };

  /** The device's saved copy of a file, or null (not saved, out of date, unreadable, or too slow to answer). */
  const readSaved = async (entry) => {
    let timer = null;
    try {
      const timeout = new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), limits.storeReadTimeoutMs);
      });
      return await Promise.race([store.read(entry.url, entry.stamp), timeout]);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  /** A sound or video: from the device if a current copy is saved there, otherwise from the internet. */
  const loadFile = async (entry) => {
    if (keepsBetweenVisits && entry.stamp) {
      const saved = await readSaved(entry);
      if (cancelled) return { blob: null, cancelled: true };
      if (saved) {
        if (saved.size > limits.maxFileBytes || heldBytes + saved.size > limits.maxTotalBytes) return { tooBig: true };
        return { blob: saved, fromStore: true };
      }
    }
    return downloadFile(entry);
  };

  const fail = (entry, error) => {
    if (cancelled) return;
    if (entry.attempts <= limits.retries) {
      entry.state = MEDIA_STATE.PENDING;
      entry.controller = null;
      entry.waiting = true;
      const timer = setTimeout(() => {
        retryTimers.delete(timer);
        entry.waiting = false;
        pump();
      }, limits.retryDelayMs);
      retryTimers.add(timer);
      emit();
      return;
    }
    settle(entry, MEDIA_STATE.FAILED, { reason: String(error?.message || error || 'failed') });
  };

  const run = (entry) => {
    entry.state = MEDIA_STATE.LOADING;
    entry.attempts += 1;
    const job = entry.kind === 'image'
      ? Promise.resolve().then(() => preloadImage(entry.url)).then(() => ({ image: true }))
      : loadFile(entry);
    job.then(
      (result) => {
        if (cancelled) return;
        if (result.image) {
          settle(entry, MEDIA_STATE.READY, { src: entry.url });
        } else if (result.tooBig) {
          settle(entry, MEDIA_STATE.STREAM, { reason: 'too-big' });
        } else {
          heldBytes += result.blob.size;
          if (keepsBetweenVisits && entry.stamp && !result.fromStore) {
            // keep it for the next visit; the book never waits for this
            Promise.resolve(store.write({ bookId: plan.bookId, url: entry.url, stamp: entry.stamp, blob: result.blob })).catch(() => {});
          }
          settle(entry, MEDIA_STATE.READY, {
            src: createObjectURL(result.blob),
            bytes: result.blob.size,
            fromStore: Boolean(result.fromStore),
          });
        }
      },
      (error) => fail(entry, error)
    );
    emit();
  };

  function pump() {
    if (!started || cancelled) return;
    const all = Array.from(entries.values());
    let smallActive = all.filter((e) => e.state === MEDIA_STATE.LOADING && e.kind !== 'video').length;
    let videoActive = all.filter((e) => e.state === MEDIA_STATE.LOADING && e.kind === 'video').length;
    const waiting = all
      .filter((e) => e.state === MEDIA_STATE.PENDING && !e.waiting)
      .sort((a, b) => compareCmsAssetPriority(a, b, pages, focus));

    for (const entry of waiting) {
      if (entry.kind === 'video') {
        // One video at a time, plus one more when this one is for the page in front of / next to the child.
        const urgent = getCmsPageBand(entry.pageIndex, focus) <= 1;
        if (videoActive >= limits.videoConcurrency + (urgent ? 1 : 0)) continue;
        videoActive += 1;
      } else {
        if (smallActive >= limits.smallConcurrency) continue;
        smallActive += 1;
      }
      run(entry);
    }
  }

  const isSettledUrl = (url) => {
    const entry = entries.get(url);
    return !entry || SETTLED.has(entry.state);
  };

  return {
    start() {
      if (started || cancelled) return;
      started = true;
      if (keepsBetweenVisits) {
        const urls = Array.from(entries.values())
          .filter((e) => e.kind !== 'image' && !e.streamOnly)
          .map((e) => e.url);
        Promise.resolve(store.openBook({ bookId: plan.bookId, urls })).catch(() => {});
      }
      pump();
      emit();
    },

    /** The child moved to this page: nearer files go first from now on. */
    setFocus(pageIndex) {
      const next = Math.max(0, Number(pageIndex) || 0);
      if (next === focus) return;
      focus = next;
      pump();
    },

    /** What a player should use for this address: the local copy if there is one, else the address itself. */
    getSrc(url) {
      const entry = entries.get(url);
      return !cancelled && entry && entry.state === MEDIA_STATE.READY && entry.src ? entry.src : url;
    },

    getState(url) {
      return entries.get(url)?.state || null;
    },

    /** True when every file the page needs has been settled (copied, streamed, or given up on). */
    isPageReady(pageIndex) {
      const urls = plan.pageUrls[pageIndex] || [];
      return urls.every(isSettledUrl);
    },

    /** 0 to 100: how many of a page's files are settled. */
    getPageProgress(pageIndex) {
      const urls = plan.pageUrls[pageIndex] || [];
      if (!urls.length) return 100;
      return Math.round((urls.filter(isSettledUrl).length / urls.length) * 100);
    },

    summary() {
      const all = Array.from(entries.values());
      return {
        total: all.length,
        ready: all.filter((e) => e.state === MEDIA_STATE.READY).length,
        fromDevice: all.filter((e) => e.fromStore).length,
        streamed: all.filter((e) => e.state === MEDIA_STATE.STREAM).length,
        failed: all.filter((e) => e.state === MEDIA_STATE.FAILED).map((e) => e.url),
        heldBytes,
      };
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getSnapshot: () => snapshot,

    /** Stop everything and free every local copy. Safe to call twice. */
    cancel() {
      if (cancelled) return;
      cancelled = true;
      retryTimers.forEach((timer) => clearTimeout(timer));
      retryTimers.clear();
      entries.forEach((entry) => {
        entry.controller?.abort();
        entry.controller = null;
        if (entry.state === MEDIA_STATE.READY && entry.src && entry.src !== entry.url) {
          revokeObjectURL(entry.src);
        }
      });
      heldBytes = 0;
      emit();
    },
  };
};
