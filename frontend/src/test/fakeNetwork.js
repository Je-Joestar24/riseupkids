/**
 * A network the test controls: every request waits until the test answers it, fails it, or the code aborts it.
 * Lets a test make a file slow, fail it, block it (like a server without CORS) or cut it off half-way.
 */

const bytes = (size) => new Uint8Array(size).fill(7);

/** A chunk that only claims a size (for files too large to really allocate). */
export const hugeChunk = (size) => ({ byteLength: size, length: size });

const makeResponse = ({ size = 8, status = 200, headers = {}, chunks = null, type = 'audio/mpeg' } = {}) => {
  const list = chunks || [bytes(size)];
  let index = 0;
  const lowered = { 'content-type': type, ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)])) };
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => lowered[String(name).toLowerCase()] ?? null },
    body: {
      getReader: () => ({
        read: async () => (index < list.length ? { done: false, value: list[index++] } : { done: true, value: undefined }),
      }),
    },
  };
};

/** `ignoreAbort`: a response already on its way that arrives even though the code gave up on it. */
export const createFakeNetwork = ({ ignoreAbort = false } = {}) => {
  const requests = [];

  const fetchImpl = (url, init = {}) =>
    new Promise((resolve, reject) => {
      const request = {
        url,
        init,
        answered: false,
        aborted: false,
        respond(options = {}) {
          if (request.answered) return;
          request.answered = true;
          resolve(makeResponse(options));
        },
        /** the network itself fails (offline, or the server sends no CORS permission) */
        fail(error = new TypeError('Failed to fetch')) {
          if (request.answered) return;
          request.answered = true;
          reject(error);
        },
      };
      init.signal?.addEventListener('abort', () => {
        request.aborted = true;
        if (!request.answered && !ignoreAbort) {
          request.answered = true;
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        }
      });
      requests.push(request);
    });

  return {
    fetchImpl,
    requests,
    /** requests still waiting for an answer and not aborted */
    open: () => requests.filter((r) => !r.answered && !r.aborted),
    urls: () => requests.map((r) => r.url),
    openUrls: () => requests.filter((r) => !r.answered && !r.aborted).map((r) => r.url),
    for: (url) => requests.filter((r) => r.url === url),
    /** answer every waiting request */
    respondAll: (options) => requests.filter((r) => !r.answered).forEach((r) => r.respond(options)),
  };
};

/** A picture loader the test controls. */
export const createFakeImages = () => {
  const calls = [];
  const preloadImage = (url) =>
    new Promise((resolve, reject) => {
      const call = { url, done: false };
      call.resolve = () => { call.done = true; resolve(); };
      call.reject = (error) => { call.done = true; reject(error); };
      calls.push(call);
    });
  return {
    preloadImage,
    calls,
    open: () => calls.filter((c) => !c.done).map((c) => c.url),
    // every open request for that address (a book opened twice has asked twice)
    finish: (url) => calls.filter((c) => c.url === url && !c.done).forEach((c) => c.resolve()),
    fail: (url, error = new Error('image failed')) => calls.find((c) => c.url === url && !c.done)?.reject(error),
  };
};

/** Object-URL bookkeeping, to prove local copies are made and freed. */
export const createFakeObjectUrls = () => {
  let counter = 0;
  const live = new Set();
  const everMade = [];
  return {
    createObjectURL: (blob) => {
      counter += 1;
      const url = `blob:fake/${counter}`;
      live.add(url);
      everMade.push({ url, size: blob.size });
      return url;
    },
    revokeObjectURL: (url) => live.delete(url),
    live,
    everMade,
  };
};

/** Let promise callbacks run (a few rounds, since downloads chain several awaits). */
export const flushPromises = async (rounds = 12) => {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};
