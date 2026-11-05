/**
 * The downloader together with the device-side saving: the first visit saves what it downloads, the next visit
 * needs no download at all, an edited book downloads only what changed, and nothing that goes wrong with the
 * saving can hold a book back.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCmsBookMediaLoader, MEDIA_STATE } from './cmsBookMediaLoader';
import { createCmsBookMediaStore } from './cmsBookMediaStore';
import { createFakeImages, createFakeNetwork, createFakeObjectUrls, flushPromises } from '../test/fakeNetwork';
import { createFakeCacheStorage, fakeResponse } from '../test/fakeCacheStorage';

const U = (name) => `https://media.test/${name}`;

const asset = (name, pageIndex, kind, updatedAt = `t-${name}`) => ({
  url: U(name), kind, pageIndex, key: null, updatedAt, streamOnly: false,
});
const planOf = (assets, { bookId = 'book-1', contentVersion = '3:2026-01-01' } = {}) => {
  const count = Math.max(...assets.map((a) => a.pageIndex), 0) + 1;
  const pageUrls = Array.from({ length: count }, () => []);
  assets.forEach((a) => pageUrls[a.pageIndex].push(a.url));
  return { bookId, contentVersion, assets, pageUrls };
};

/** one device: its storage survives from one visit to the next */
const makeDevice = (storeOptions = {}) => {
  const fake = createFakeCacheStorage(storeOptions.cache);
  const newStore = () =>
    createCmsBookMediaStore({ cachesImpl: fake.storage, makeResponse: fakeResponse, origin: 'https://app.test', ...storeOptions.store });
  return { fake, newStore };
};

/** one visit: a new downloader, on a new (fake) network */
const visit = (plan, store, limits = {}) => {
  const net = createFakeNetwork();
  const images = createFakeImages();
  const urls = createFakeObjectUrls();
  const loader = createCmsBookMediaLoader({
    plan,
    pages: [],
    fetchImpl: net.fetchImpl,
    preloadImage: images.preloadImage,
    createObjectURL: urls.createObjectURL,
    revokeObjectURL: urls.revokeObjectURL,
    store,
    ...limits,
  });
  return { loader, net, images, urls, store };
};

/** Let promises and the device storage's real asynchronous steps finish. */
const tick = async (rounds = 8) => {
  for (let i = 0; i < rounds; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (vi.isFakeTimers()) await flushPromises(30);
    // eslint-disable-next-line no-await-in-loop
    else await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const answerAll = async (v, options = { size: 64 }) => {
  await tick();
  v.net.respondAll(options);
  await tick();
};

afterEach(() => vi.useRealTimers());

describe('first visit: downloaded files are kept for next time', () => {
  it('each sound and video is kept once it has fully arrived', async () => {
    const device = makeDevice();
    const plan = planOf([asset('a.mp3', 0, 'audio'), asset('v.mp4', 1, 'video')]);
    const v = visit(plan, device.newStore());
    v.loader.start();
    await answerAll(v, { size: 500 });

    expect(v.loader.summary()).toMatchObject({ ready: 2, fromDevice: 0 });
    expect(device.fake.keptUrls().sort()).toEqual([U('a.mp3'), U('v.mp4')]);
    const index = await device.newStore().inspect();
    expect(index.files[U('a.mp3')]).toEqual({ stamp: 't-a.mp3', bytes: 500 });
    expect(index.books['book-1'].urls.sort()).toEqual([U('a.mp3'), U('v.mp4')]);
  });

  it('pictures and embeds are not kept by this layer', async () => {
    const device = makeDevice();
    const plan = planOf([
      asset('i.jpg', 0, 'image'),
      { ...asset('embed', 0, 'video'), url: 'https://iframe.mediadelivery.net/embed/1/2', streamOnly: true },
      asset('a.mp3', 0, 'audio'),
    ]);
    const v = visit(plan, device.newStore());
    v.loader.start();
    await tick();
    v.images.finish(U('i.jpg'));
    await answerAll(v);

    expect(device.fake.keptUrls()).toEqual([U('a.mp3')]);
    const index = await device.newStore().inspect();
    expect(index.books['book-1'].urls).toEqual([U('a.mp3')]);
  });

  it('a file that failed, was refused, or was too big is not kept', async () => {
    const device = makeDevice();
    const plan = planOf([asset('bad.mp3', 0, 'audio'), asset('big.mp4', 0, 'video'), asset('ok.mp3', 0, 'audio')]);
    const v = visit(plan, device.newStore(), { maxFileBytes: 100, retries: 0 });
    v.loader.start();
    await tick();
    v.net.for(U('bad.mp3'))[0].respond({ status: 403 });
    v.net.for(U('big.mp4'))[0].respond({ size: 500, headers: { 'content-length': 500 } });
    v.net.for(U('ok.mp3'))[0].respond({ size: 50 });
    await tick();

    expect(v.loader.getState(U('bad.mp3'))).toBe(MEDIA_STATE.FAILED);
    expect(v.loader.getState(U('big.mp4'))).toBe(MEDIA_STATE.STREAM);
    expect(device.fake.keptUrls()).toEqual([U('ok.mp3')]);
  });

  it('closing the book before a file arrives keeps nothing of it', async () => {
    const device = makeDevice();
    const plan = planOf([asset('a.mp3', 0, 'audio')]);
    const v = visit(plan, device.newStore());
    const net = createFakeNetwork({ ignoreAbort: true });
    const loader = createCmsBookMediaLoader({
      plan, fetchImpl: net.fetchImpl, preloadImage: v.images.preloadImage,
      createObjectURL: v.urls.createObjectURL, revokeObjectURL: v.urls.revokeObjectURL, store: device.newStore(),
    });
    loader.start();
    await tick();
    loader.cancel();
    net.respondAll({ size: 300 }); // the answer was already on its way
    await tick();

    expect(device.fake.keptUrls()).toEqual([]);
  });

  it('keeping a file never holds the book back, even if the device never answers', async () => {
    const plan = planOf([asset('a.mp3', 0, 'audio')]);
    const store = {
      available: true,
      read: async () => null,
      write: () => new Promise(() => {}), // never finishes
      openBook: () => new Promise(() => {}),
    };
    const v = visit(plan, store);
    v.loader.start();
    await answerAll(v);
    expect(v.loader.isPageReady(0)).toBe(true);
    expect(v.loader.getSrc(U('a.mp3'))).toMatch(/^blob:/);
  });

  it('a device that refuses to keep files changes nothing for the child', async () => {
    const device = makeDevice({ cache: { quotaBytes: 10 } });
    const plan = planOf([asset('a.mp3', 0, 'audio'), asset('b.mp3', 0, 'audio')]);
    const v = visit(plan, device.newStore());
    v.loader.start();
    await answerAll(v, { size: 500 });
    expect(v.loader.summary()).toMatchObject({ ready: 2, failed: [] });
    expect(device.fake.keptUrls()).toEqual([]);
  });

  it('a store that throws is ignored', async () => {
    const plan = planOf([asset('a.mp3', 0, 'audio')]);
    const store = {
      available: true,
      read: async () => { throw new Error('boom'); },
      write: async () => { throw new Error('boom'); },
      openBook: async () => { throw new Error('boom'); },
    };
    const v = visit(plan, store);
    v.loader.start();
    await answerAll(v);
    expect(v.loader.getState(U('a.mp3'))).toBe(MEDIA_STATE.READY);
  });
});

describe('next visit: nothing is downloaded', () => {
  const firstVisit = async (device, plan) => {
    const v = visit(plan, device.newStore());
    v.loader.start();
    await answerAll(v, { size: 256 });
    v.loader.cancel(); // the child closed the book
    await v.store.whenSettled(); // the saving carries on after closing
    await tick();
    return v;
  };

  it('every sound and video comes from the device and the internet is not asked at all', async () => {
    const device = makeDevice();
    const plan = planOf([asset('a.mp3', 0, 'audio'), asset('v.mp4', 1, 'video'), asset('b.mp3', 2, 'audio')]);
    await firstVisit(device, plan);

    const again = visit(plan, device.newStore());
    again.loader.start();
    await tick();

    expect(again.net.requests).toHaveLength(0);
    expect(again.loader.summary()).toMatchObject({ total: 3, ready: 3, fromDevice: 3, heldBytes: 768 });
    expect(again.loader.isPageReady(0)).toBe(true);
    expect(again.loader.getSrc(U('v.mp4'))).toMatch(/^blob:/);
  });

  it('works with the internet completely off', async () => {
    const device = makeDevice();
    const plan = planOf([asset('a.mp3', 0, 'audio')]);
    await firstVisit(device, plan);

    const offline = visit(plan, device.newStore());
    offline.net.fetchImpl = undefined;
    const loader = createCmsBookMediaLoader({
      plan,
      fetchImpl: () => Promise.reject(new TypeError('Failed to fetch')),
      preloadImage: offline.images.preloadImage,
      createObjectURL: offline.urls.createObjectURL,
      revokeObjectURL: offline.urls.revokeObjectURL,
      store: device.newStore(),
    });
    loader.start();
    await tick();
    expect(loader.getState(U('a.mp3'))).toBe(MEDIA_STATE.READY);
    expect(loader.summary().fromDevice).toBe(1);
  });

  it('closing the book frees the memory copies but keeps the saved ones', async () => {
    const device = makeDevice();
    const plan = planOf([asset('a.mp3', 0, 'audio')]);
    await firstVisit(device, plan);

    const again = visit(plan, device.newStore());
    again.loader.start();
    await tick();
    expect(again.urls.live.size).toBe(1);
    again.loader.cancel();
    expect(again.urls.live.size).toBe(0);
    expect(device.fake.keptUrls()).toEqual([U('a.mp3')]);
  });

  it('a saved file is not saved a second time', async () => {
    const device = makeDevice();
    const plan = planOf([asset('a.mp3', 0, 'audio')]);
    await firstVisit(device, plan);
    const putsBefore = device.fake.log.puts.length;

    const again = visit(plan, device.newStore());
    again.loader.start();
    await tick();

    const putsAfter = device.fake.log.puts.slice(putsBefore).filter((key) => key === U('a.mp3'));
    expect(putsAfter).toHaveLength(0);
  });

  it('a copy that is gone or damaged is downloaded again, and the book still opens', async () => {
    const device = makeDevice();
    const plan = planOf([asset('a.mp3', 0, 'audio'), asset('b.mp3', 0, 'audio')]);
    await firstVisit(device, plan);
    device.fake.vanish(U('a.mp3'));
    device.fake.damage(U('b.mp3'), new Blob([new Uint8Array(3)]));

    const again = visit(plan, device.newStore());
    again.loader.start();
    await tick();
    expect(again.net.openUrls().sort()).toEqual([U('a.mp3'), U('b.mp3')]);
    again.net.respondAll({ size: 256 });
    await tick();
    expect(again.loader.summary()).toMatchObject({ ready: 2, fromDevice: 0 });
    // and they are saved properly again
    expect(device.fake.keptUrls().sort()).toEqual([U('a.mp3'), U('b.mp3')]);
  });

  it('a saved file bigger than this visit\'s limit is streamed, like a downloaded one would be', async () => {
    const device = makeDevice();
    const plan = planOf([asset('v.mp4', 0, 'video')]);
    await firstVisit(device, plan);

    const again = visit(plan, device.newStore(), { maxFileBytes: 100 });
    again.loader.start();
    await tick();
    expect(again.loader.getState(U('v.mp4'))).toBe(MEDIA_STATE.STREAM);
    expect(again.net.requests).toHaveLength(0);
  });

  it('closing the book while a saved copy is still being read creates no memory copy', async () => {
    const device = makeDevice();
    const plan = planOf([asset('a.mp3', 0, 'audio')]);
    await firstVisit(device, plan);

    const urls = createFakeObjectUrls();
    let release;
    const slow = {
      available: true,
      openBook: async () => {},
      write: async () => true,
      read: () => new Promise((resolve) => { release = () => resolve(new Blob([new Uint8Array(256)])); }),
    };
    const loader = createCmsBookMediaLoader({
      plan, fetchImpl: createFakeNetwork().fetchImpl, preloadImage: createFakeImages().preloadImage,
      createObjectURL: urls.createObjectURL, revokeObjectURL: urls.revokeObjectURL, store: slow,
    });
    loader.start();
    await tick();
    loader.cancel();
    release();
    await tick();
    expect(urls.everMade).toHaveLength(0);
  });
});

describe('an edited book downloads only what changed', () => {
  const visitOnce = async (device, plan) => {
    const v = visit(plan, device.newStore());
    v.loader.start();
    await tick();
    v.net.respondAll({ size: 256 });
    await tick();
    v.loader.cancel();
    await v.store.whenSettled();
    return v;
  };

  it('a file with a newer change date is downloaded again; the others come from the device', async () => {
    const device = makeDevice();
    await visitOnce(device, planOf([asset('a.mp3', 0, 'audio', 'T1'), asset('b.mp3', 1, 'audio', 'T1')]));

    const edited = planOf(
      [asset('a.mp3', 0, 'audio', 'T1'), asset('b.mp3', 1, 'audio', 'T2')],
      { contentVersion: '4:2026-02-01' }
    );
    const again = visit(edited, device.newStore());
    again.loader.start();
    await tick();

    expect(again.net.openUrls()).toEqual([U('b.mp3')]);
    again.net.respondAll({ size: 300 });
    await tick();
    expect(again.loader.summary()).toMatchObject({ ready: 2, fromDevice: 1 });

    // and the new one is what is kept now
    const index = await device.newStore().inspect();
    expect(index.files[U('b.mp3')]).toEqual({ stamp: 'T2', bytes: 300 });
  });

  it('a file replaced by a new one (new address) removes the old one from the device', async () => {
    const device = makeDevice();
    await visitOnce(device, planOf([asset('old.mp3', 0, 'audio')]));
    expect(device.fake.has(U('old.mp3'))).toBe(true);

    const edited = planOf([asset('new.mp3', 0, 'audio')], { contentVersion: '4:later' });
    const again = visit(edited, device.newStore());
    again.loader.start();
    await tick();
    again.net.respondAll({ size: 256 });
    await tick();

    expect(device.fake.has(U('old.mp3'))).toBe(false);
    expect(device.fake.has(U('new.mp3'))).toBe(true);
  });

  it('without per-file dates, the book version decides: same version reuses, a new version downloads again', async () => {
    const device = makeDevice();
    const noDates = (names, version) => planOf(names.map((n, i) => asset(n, i, 'audio', null)), { contentVersion: version });
    await visitOnce(device, noDates(['a.mp3', 'b.mp3'], '3:x'));

    const same = visit(noDates(['a.mp3', 'b.mp3'], '3:x'), device.newStore());
    same.loader.start();
    await tick();
    expect(same.net.requests).toHaveLength(0);

    const bumped = visit(noDates(['a.mp3', 'b.mp3'], '4:y'), device.newStore());
    bumped.loader.start();
    await tick();
    expect(bumped.net.openUrls().sort()).toEqual([U('a.mp3'), U('b.mp3')]);
  });

  it('with no date and no version there is nothing to compare against, so nothing is kept or reused', async () => {
    const device = makeDevice();
    const plan = planOf([asset('a.mp3', 0, 'audio', null)], { contentVersion: null });
    await visitOnce(device, plan);
    expect(device.fake.keptUrls()).toEqual([]);

    const again = visit(plan, device.newStore());
    again.loader.start();
    await tick();
    expect(again.net.openUrls()).toEqual([U('a.mp3')]);
  });

  it('a book with no id is not kept', async () => {
    const device = makeDevice();
    const plan = planOf([asset('a.mp3', 0, 'audio')], { bookId: null });
    await visitOnce(device, plan);
    expect(device.fake.keptUrls()).toEqual([]);
  });
});

describe('a slow or stuck device storage', () => {
  it('after the wait limit the file comes from the internet instead', async () => {
    vi.useFakeTimers();
    const plan = planOf([asset('a.mp3', 0, 'audio')]);
    const store = { available: true, openBook: async () => {}, write: async () => true, read: () => new Promise(() => {}) };
    const v = visit(plan, store, { storeReadTimeoutMs: 2000 });
    v.loader.start();
    await vi.advanceTimersByTimeAsync(1999);
    expect(v.net.requests).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(2);
    expect(v.net.openUrls()).toEqual([U('a.mp3')]);
    v.net.respondAll({ size: 64 });
    await tick();
    expect(v.loader.getState(U('a.mp3'))).toBe(MEDIA_STATE.READY);
  });

  it('a device that never answers (storage object hangs) still lets the book open', async () => {
    vi.useFakeTimers();
    const device = makeDevice({ cache: { neverAnswer: true } });
    const plan = planOf([asset('a.mp3', 0, 'audio')]);
    const v = visit(plan, device.newStore(), { storeReadTimeoutMs: 1000 });
    v.loader.start();
    await vi.advanceTimersByTimeAsync(1500);
    expect(v.net.openUrls()).toEqual([U('a.mp3')]);
  });
});

describe('without a store nothing changes', () => {
  it('no store: files are downloaded and no saving is attempted', async () => {
    const plan = planOf([asset('a.mp3', 0, 'audio')]);
    const v = visit(plan, null);
    v.loader.start();
    await answerAll(v);
    expect(v.loader.summary()).toMatchObject({ ready: 1, fromDevice: 0 });
  });

  it('a store marked unavailable is not asked anything', async () => {
    const calls = [];
    const store = {
      available: false,
      read: async (...a) => { calls.push(['read', a]); return null; },
      write: async (...a) => { calls.push(['write', a]); return false; },
      openBook: async (...a) => { calls.push(['openBook', a]); },
    };
    const v = visit(planOf([asset('a.mp3', 0, 'audio')]), store);
    v.loader.start();
    await answerAll(v);
    expect(calls).toEqual([]);
  });
});
