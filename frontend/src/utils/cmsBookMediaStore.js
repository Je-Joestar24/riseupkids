/**
 * Keeps a built-in book's sound and video on the child's device between visits (the browser's Cache Storage),
 * so opening the same book again needs no download at all.
 *
 * - A saved file is only used when its "stamp" matches what the server says now: the file's own `updatedAt`
 *   from the book's media list, or (when the list has none) the book's `contentVersion`. An edited book therefore
 *   downloads again only what changed; an untouched book downloads nothing.
 * - A small index (saved with the files, in the same cache) records each file's stamp and size and which books use
 *   it. A file is used only if the index and the cache agree and the size is exactly what was saved, so a half-saved
 *   file is never played.
 * - The total is capped. When a new file will not fit, the books opened longest ago are removed first (never the
 *   book being opened). A file the browser refuses to keep (full, private window) is simply not kept.
 * - Nothing here can leave a child stuck: every failure answers "not saved" and the downloader goes to the internet.
 *
 * Pictures are not kept here (the browser's own picture cache already keeps them).
 */

const MB = 1024 * 1024;

export const CMS_MEDIA_STORE = Object.freeze({
  cacheName: 'ruk-book-media-v1',
  indexPath: '/__ruk-book-media-index__',
  maxBytes: 600 * MB,
});

const emptyIndex = () => ({ files: {}, books: {} });

const defaultMakeResponse = (blob) =>
  new Response(blob, {
    headers: {
      'content-type': blob.type || 'application/octet-stream',
      'content-length': String(blob.size),
    },
  });

/** A store that keeps nothing (no Cache Storage, e.g. an insecure page): every call answers "not saved". */
export const unavailableCmsBookMediaStore = Object.freeze({
  available: false,
  read: async () => null,
  write: async () => false,
  openBook: async () => {},
  whenSettled: async () => {},
  inspect: async () => emptyIndex(),
});

/**
 * @param {{
 *   cachesImpl?: CacheStorage,
 *   maxBytes?: number,
 *   now?: () => number,
 *   makeResponse?: (blob: Blob) => Response,
 *   origin?: string,
 * }} options
 */
export const createCmsBookMediaStore = (options = {}) => {
  const storage = options.cachesImpl ?? globalThis.caches;
  if (!storage || typeof storage.open !== 'function') return unavailableCmsBookMediaStore;

  const maxBytes = typeof options.maxBytes === 'number' ? options.maxBytes : CMS_MEDIA_STORE.maxBytes;
  const now = options.now || (() => Date.now());
  const makeResponse = options.makeResponse || defaultMakeResponse;
  const origin = options.origin || globalThis.location?.origin || 'https://app.invalid';
  const indexUrl = `${origin}${CMS_MEDIA_STORE.indexPath}`;

  let cachePromise = null;
  let indexPromise = null;
  let chain = Promise.resolve(); // changes to the index and the files happen one after another

  const openCache = () => {
    if (!cachePromise) cachePromise = storage.open(CMS_MEDIA_STORE.cacheName);
    return cachePromise;
  };

  const enqueue = (job) => {
    const next = chain.then(job, job);
    chain = next.then(() => undefined, () => undefined);
    return next;
  };

  const loadIndex = async () => {
    const cache = await openCache();
    try {
      const response = await cache.match(indexUrl);
      if (!response) return emptyIndex();
      const parsed = await response.json();
      if (!parsed || typeof parsed.files !== 'object' || typeof parsed.books !== 'object') throw new Error('bad index');
      return { files: parsed.files || {}, books: parsed.books || {} };
    } catch (error) {
      // An index we cannot trust means files we cannot account for: start clean.
      try {
        await storage.delete(CMS_MEDIA_STORE.cacheName);
      } catch {
        /* nothing more to do */
      }
      cachePromise = null;
      return emptyIndex();
    }
  };

  const getIndex = () => {
    if (!indexPromise) {
      indexPromise = loadIndex().catch(() => {
        indexPromise = null;
        return emptyIndex();
      });
    }
    return indexPromise;
  };

  const saveIndex = async (index) => {
    const cache = await openCache();
    const body = JSON.stringify(index);
    await cache.put(
      indexUrl,
      new Response(body, { headers: { 'content-type': 'application/json' } })
    );
  };

  const totalBytes = (index) => Object.values(index.files).reduce((sum, file) => sum + (file.bytes || 0), 0);

  const dropFile = async (index, url) => {
    delete index.files[url];
    try {
      const cache = await openCache();
      await cache.delete(url);
    } catch {
      /* the entry is gone from the index; a stray file is removed with the next clean-up */
    }
  };

  /** Remove every saved file that no book uses any more. */
  const sweepOrphans = async (index) => {
    const used = new Set();
    Object.values(index.books).forEach((book) => (book.urls || []).forEach((url) => used.add(url)));
    const orphans = Object.keys(index.files).filter((url) => !used.has(url));
    for (const url of orphans) {
      // eslint-disable-next-line no-await-in-loop
      await dropFile(index, url);
    }
  };

  /** Make room for `needed` more bytes by removing the books opened longest ago (never `protectedBookId`). */
  const makeRoom = async (index, needed, protectedBookId) => {
    while (totalBytes(index) + needed > maxBytes) {
      const victims = Object.entries(index.books)
        .filter(([id]) => id !== protectedBookId)
        .sort((a, b) => (a[1].lastOpened || 0) - (b[1].lastOpened || 0));
      if (!victims.length) return false;
      delete index.books[victims[0][0]];
      // eslint-disable-next-line no-await-in-loop
      await sweepOrphans(index);
    }
    return true;
  };

  return {
    available: true,

    /** The saved copy of this file, if it is there, whole, and for the same stamp. Otherwise null. */
    async read(url, stamp) {
      if (!url || !stamp) return null;
      const index = await getIndex();
      const entry = index.files[url];
      if (!entry || entry.stamp !== String(stamp)) return null;
      try {
        const cache = await openCache();
        const response = await cache.match(url);
        const blob = response ? await response.blob() : null;
        if (blob && blob.size === entry.bytes) return blob;
      } catch {
        /* treated like a missing file below */
      }
      // The index promised a file the cache cannot give whole: forget it.
      await enqueue(async () => {
        if (index.files[url] !== entry) return;
        await dropFile(index, url);
        await saveIndex(index).catch(() => {});
      });
      return null;
    },

    /** Keep a finished download. Resolves true when it was kept. */
    write({ bookId, url, stamp, blob }) {
      if (!bookId || !url || !stamp || !blob || !blob.size) return Promise.resolve(false);
      return enqueue(async () => {
        try {
          const index = await getIndex();
          const old = index.files[url];
          if (old) {
            // a replaced file does not count twice
            index.files[url] = { ...old, bytes: 0 };
          }
          if (blob.size > maxBytes || !(await makeRoom(index, blob.size, bookId))) {
            if (old) await dropFile(index, url);
            return false;
          }
          const cache = await openCache();
          await cache.put(url, makeResponse(blob));
          index.files[url] = { stamp: String(stamp), bytes: blob.size };
          const book = index.books[bookId] || { urls: [], lastOpened: now() };
          if (!book.urls.includes(url)) book.urls.push(url);
          index.books[bookId] = book;
          try {
            await saveIndex(index);
          } catch (error) {
            await dropFile(index, url);
            throw error;
          }
          return true;
        } catch {
          // full, private window, storage switched off...: this file is just not kept
          return false;
        }
      });
    },

    /** A book is being opened: record the files it uses, forget the ones it no longer uses, make room. */
    openBook({ bookId, urls = [] }) {
      if (!bookId) return Promise.resolve();
      return enqueue(async () => {
        try {
          const index = await getIndex();
          index.books[bookId] = { urls: Array.from(new Set(urls)), lastOpened: now() };
          await sweepOrphans(index);
          await makeRoom(index, 0, bookId);
          await saveIndex(index);
        } catch {
          /* nothing saved this time; the book still works */
        }
      });
    },

    /** Resolves when every save and clean-up asked for so far has finished (for tests and for closing). */
    whenSettled: () => chain,

    /** What is kept (for tests and for looking at the real browser). */
    async inspect() {
      const index = await getIndex();
      return JSON.parse(JSON.stringify(index));
    },
  };
};

let defaultStore = null;
let defaultStoreFor;

/** The store for this page's Cache Storage (made once; rebuilt only if the page's storage object changes). */
export const getDefaultCmsBookMediaStore = () => {
  const current = globalThis.caches;
  if (defaultStore && defaultStoreFor === current) return defaultStore;
  defaultStoreFor = current;
  defaultStore = createCmsBookMediaStore({ cachesImpl: current });
  return defaultStore;
};
