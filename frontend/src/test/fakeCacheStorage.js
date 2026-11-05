/**
 * A Cache Storage the test controls: it keeps what is put in it, can run out of room, can refuse to open, can answer
 * slowly or never, and lets a test damage what is kept (to prove a damaged file is never played).
 *
 * Files are put in as the test's own response objects (`fakeResponse(blob)`), because the real `Response` of the
 * test environment cannot carry a jsdom Blob. The index (JSON) goes through the real `Response`.
 */

/** What the store puts for a file when the test hands it to `createCmsBookMediaStore({ makeResponse })`. */
export const fakeResponse = (blob) => ({ __fake: true, blob: async () => blob, size: blob.size });

const keyOf = (request) => String(request?.url || request);

export const createFakeCacheStorage = ({ quotaBytes = Infinity, failOpen = false, neverAnswer = false } = {}) => {
  const caches = new Map(); // cache name -> Map(url -> { response, bytes })
  const log = { puts: [], deletes: [], matches: [] };
  let used = 0;

  const bytesOf = async (response) => {
    if (response?.__fake) return response.size;
    const text = await response.clone().text();
    return text.length;
  };

  const makeCache = (name) => {
    const map = caches.get(name);
    return {
      match: async (request) => {
        if (neverAnswer) return new Promise(() => {});
        log.matches.push(keyOf(request));
        const record = map.get(keyOf(request));
        if (!record) return undefined;
        // the browser gives a fresh response each time (a body can be read only once)
        return record.response.__fake ? record.response : record.response.clone();
      },
      put: async (request, response) => {
        const key = keyOf(request);
        const bytes = await bytesOf(response);
        const old = map.get(key);
        if (used - (old?.bytes || 0) + bytes > quotaBytes) {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        }
        used += bytes - (old?.bytes || 0);
        map.set(key, { response: response.__fake ? response : response.clone(), bytes });
        log.puts.push(key);
      },
      delete: async (request) => {
        const key = keyOf(request);
        const old = map.get(key);
        if (!old) return false;
        used -= old.bytes;
        map.delete(key);
        log.deletes.push(key);
        return true;
      },
    };
  };

  const storage = {
    open: async (name) => {
      if (failOpen) throw new Error('Cache Storage is switched off');
      if (!caches.has(name)) caches.set(name, new Map());
      return makeCache(name);
    },
    delete: async (name) => {
      const map = caches.get(name);
      if (!map) return false;
      map.forEach((record) => { used -= record.bytes; });
      caches.delete(name);
      return true;
    },
  };

  const first = () => caches.values().next().value || new Map();

  return {
    storage,
    log,
    /** addresses of the files kept (not counting the index) */
    keptUrls: () => Array.from(first().keys()).filter((key) => !key.includes('__ruk-book-media-index__')),
    has: (url) => first().has(url),
    /** the saved response for an address, to damage it */
    raw: (url) => first().get(url),
    /** replace what is kept for an address with a smaller / different file, as a half-saved one would be */
    damage: (url, blob) => {
      const record = first().get(url);
      if (record) record.response = fakeResponse(blob);
    },
    /** remove a file behind the store's back (the browser cleaning up) */
    vanish: (url) => first().delete(url),
    /** replace the saved index with this text (to prove a broken index is not trusted) */
    corruptIndex: (text) => {
      const key = Array.from(first().keys()).find((k) => k.includes('__ruk-book-media-index__'));
      if (key) first().get(key).response = new Response(text);
    },
    usedBytes: () => used,
    cacheCount: () => caches.size,
  };
};
