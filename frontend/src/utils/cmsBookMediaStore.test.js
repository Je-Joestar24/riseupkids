/**
 * The device-side saving layer, tested against a Cache Storage the test controls: what is kept, what is trusted,
 * what happens when the device is full, switched off, damaged, or the book is edited.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  createCmsBookMediaStore,
  getDefaultCmsBookMediaStore,
  unavailableCmsBookMediaStore,
  CMS_MEDIA_STORE,
} from './cmsBookMediaStore';
import { createFakeCacheStorage, fakeResponse } from '../test/fakeCacheStorage';

const U = (name) => `https://media.test/${name}`;
const file = (size, type = 'audio/mpeg') => new Blob([new Uint8Array(size)], { type });

const setup = ({ maxBytes, quotaBytes, failOpen, neverAnswer } = {}) => {
  const fake = createFakeCacheStorage({ quotaBytes, failOpen, neverAnswer });
  let clock = 1000;
  const make = () =>
    createCmsBookMediaStore({
      cachesImpl: fake.storage,
      maxBytes,
      makeResponse: fakeResponse,
      now: () => (clock += 10),
      origin: 'https://app.test',
    });
  return { fake, store: make(), make };
};

describe('saving a file and getting it back', () => {
  it('a saved file comes back whole for the same stamp', async () => {
    const { store, fake } = setup();
    await store.openBook({ bookId: 'b1', urls: [U('a.mp3')] });
    expect(await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(2048) })).toBe(true);

    const back = await store.read(U('a.mp3'), 'v1');
    expect(back.size).toBe(2048);
    expect(fake.keptUrls()).toEqual([U('a.mp3')]);
  });

  it('is not used when the stamp changed (the file or the book was edited)', async () => {
    const { store } = setup();
    await store.openBook({ bookId: 'b1', urls: [U('a.mp3')] });
    await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(100) });
    expect(await store.read(U('a.mp3'), 'v2')).toBeNull();
    expect(await store.read(U('a.mp3'), 'v1')).not.toBeNull();
  });

  it('a file that was never saved reads as nothing', async () => {
    const { store } = setup();
    expect(await store.read(U('nope.mp3'), 'v1')).toBeNull();
  });

  it('a file without a stamp, or a book without a name, is never saved or read', async () => {
    const { store, fake } = setup();
    expect(await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: '', blob: file(10) })).toBe(false);
    expect(await store.write({ bookId: '', url: U('a.mp3'), stamp: 'v1', blob: file(10) })).toBe(false);
    expect(await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(0) })).toBe(false);
    expect(await store.read(U('a.mp3'), '')).toBeNull();
    expect(fake.keptUrls()).toEqual([]);
  });

  it('is still there on the next visit (a new store on the same device storage)', async () => {
    const { store, make } = setup();
    await store.openBook({ bookId: 'b1', urls: [U('a.mp3'), U('v.mp4')] });
    await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(300) });
    await store.write({ bookId: 'b1', url: U('v.mp4'), stamp: 'v1', blob: file(900, 'video/mp4') });

    const nextVisit = make();
    expect((await nextVisit.read(U('a.mp3'), 'v1')).size).toBe(300);
    expect((await nextVisit.read(U('v.mp4'), 'v1')).size).toBe(900);
  });

  it('many files saved at once are all remembered', async () => {
    const { store, make } = setup();
    const names = Array.from({ length: 12 }, (_, i) => `f${i}.mp3`);
    await store.openBook({ bookId: 'b1', urls: names.map(U) });
    await Promise.all(names.map((n) => store.write({ bookId: 'b1', url: U(n), stamp: 'v1', blob: file(50) })));
    const index = await make().inspect();
    expect(Object.keys(index.files).sort()).toEqual(names.map(U).sort());
  });

  it('saving the same file again (after an edit) replaces it and counts it once', async () => {
    const { store, fake } = setup();
    await store.openBook({ bookId: 'b1', urls: [U('a.mp3')] });
    await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(500) });
    await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v2', blob: file(700) });
    expect(await store.read(U('a.mp3'), 'v1')).toBeNull();
    expect((await store.read(U('a.mp3'), 'v2')).size).toBe(700);
    const index = await store.inspect();
    expect(index.files[U('a.mp3')]).toEqual({ stamp: 'v2', bytes: 700 });
    expect(fake.keptUrls()).toEqual([U('a.mp3')]);
  });
});

describe('never playing a damaged copy', () => {
  it('a half-saved file (wrong size) is not used and is forgotten', async () => {
    const { store, fake } = setup();
    await store.openBook({ bookId: 'b1', urls: [U('a.mp3')] });
    await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(1000) });
    fake.damage(U('a.mp3'), file(400));

    expect(await store.read(U('a.mp3'), 'v1')).toBeNull();
    expect((await store.inspect()).files[U('a.mp3')]).toBeUndefined();
    expect(fake.has(U('a.mp3'))).toBe(false);
  });

  it('a file the device cleaned up behind our back reads as nothing and is forgotten', async () => {
    const { store, fake } = setup();
    await store.openBook({ bookId: 'b1', urls: [U('a.mp3')] });
    await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(1000) });
    fake.vanish(U('a.mp3'));

    expect(await store.read(U('a.mp3'), 'v1')).toBeNull();
    expect((await store.inspect()).files[U('a.mp3')]).toBeUndefined();
  });

  it('a broken index is not trusted: everything is cleared and saving starts again', async () => {
    const { store, fake, make } = setup();
    await store.openBook({ bookId: 'b1', urls: [U('a.mp3')] });
    await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(1000) });
    fake.corruptIndex('{ this is not json');

    const nextVisit = make();
    expect(await nextVisit.read(U('a.mp3'), 'v1')).toBeNull();
    expect(fake.has(U('a.mp3'))).toBe(false); // the old unaccounted file is gone with the cache
    await nextVisit.openBook({ bookId: 'b1', urls: [U('a.mp3')] });
    expect(await nextVisit.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(10) })).toBe(true);
    expect((await nextVisit.read(U('a.mp3'), 'v1')).size).toBe(10);
  });

  it('an index of the wrong shape is not trusted either', async () => {
    const { store, fake, make } = setup();
    await store.openBook({ bookId: 'b1', urls: [U('a.mp3')] });
    fake.corruptIndex('"hello"');
    expect(await make().read(U('a.mp3'), 'v1')).toBeNull();
    expect(await make().inspect()).toEqual({ files: {}, books: {} });
  });
});

describe('when the device cannot keep it', () => {
  it('a full device (the browser refuses the file) is not an error: the file is just not kept', async () => {
    const { store, fake } = setup({ quotaBytes: 5000 });
    await store.openBook({ bookId: 'b1', urls: [U('a.mp3'), U('b.mp3')] });
    expect(await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(3000) })).toBe(true);
    expect(await store.write({ bookId: 'b1', url: U('b.mp3'), stamp: 'v1', blob: file(3000) })).toBe(false);

    expect(await store.read(U('b.mp3'), 'v1')).toBeNull();
    expect((await store.read(U('a.mp3'), 'v1')).size).toBe(3000); // what fit still works
    expect((await store.inspect()).files[U('b.mp3')]).toBeUndefined();
    expect(fake.has(U('b.mp3'))).toBe(false);
  });

  it('storage switched off (cannot be opened): reading says nothing, writing says no, nothing throws', async () => {
    const { store } = setup({ failOpen: true });
    await expect(store.openBook({ bookId: 'b1', urls: [U('a.mp3')] })).resolves.toBeUndefined();
    expect(await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(10) })).toBe(false);
    expect(await store.read(U('a.mp3'), 'v1')).toBeNull();
  });

  it('a page with no Cache Storage at all (an insecure address) gets a store that keeps nothing', async () => {
    const store = createCmsBookMediaStore({ cachesImpl: null });
    // (globalThis.caches does not exist in these tests, so passing nothing is the same)
    expect(store).toBe(unavailableCmsBookMediaStore);
    expect(store.available).toBe(false);
    expect(await store.read(U('a.mp3'), 'v1')).toBeNull();
    expect(await store.write({ bookId: 'b', url: U('a.mp3'), stamp: 'v', blob: file(5) })).toBe(false);
    await expect(store.openBook({ bookId: 'b', urls: [] })).resolves.toBeUndefined();
  });
});

describe('keeping the total small', () => {
  it('the book opened longest ago is removed first to make room, with its files', async () => {
    const { store, fake } = setup({ maxBytes: 1000 });
    await store.openBook({ bookId: 'old', urls: [U('o.mp3')] });
    await store.write({ bookId: 'old', url: U('o.mp3'), stamp: 'v1', blob: file(600) });
    await store.openBook({ bookId: 'mid', urls: [U('m.mp3')] });
    await store.write({ bookId: 'mid', url: U('m.mp3'), stamp: 'v1', blob: file(300) });
    await store.openBook({ bookId: 'new', urls: [U('n.mp3')] });

    expect(await store.write({ bookId: 'new', url: U('n.mp3'), stamp: 'v1', blob: file(500) })).toBe(true);

    const index = await store.inspect();
    expect(Object.keys(index.books).sort()).toEqual(['mid', 'new']);
    expect(fake.has(U('o.mp3'))).toBe(false);
    expect(fake.has(U('m.mp3'))).toBe(true);
    expect(fake.has(U('n.mp3'))).toBe(true);
  });

  it('opening a book again makes it the newest, so it is kept and the other one goes', async () => {
    const { store, fake } = setup({ maxBytes: 1000 });
    await store.openBook({ bookId: 'a', urls: [U('a.mp3')] });
    await store.write({ bookId: 'a', url: U('a.mp3'), stamp: 'v1', blob: file(400) });
    await store.openBook({ bookId: 'b', urls: [U('b.mp3')] });
    await store.write({ bookId: 'b', url: U('b.mp3'), stamp: 'v1', blob: file(400) });
    await store.openBook({ bookId: 'a', urls: [U('a.mp3')] }); // a is newest now
    await store.openBook({ bookId: 'c', urls: [U('c.mp3')] });
    await store.write({ bookId: 'c', url: U('c.mp3'), stamp: 'v1', blob: file(400) });

    expect(fake.has(U('b.mp3'))).toBe(false);
    expect(fake.has(U('a.mp3'))).toBe(true);
    expect(fake.has(U('c.mp3'))).toBe(true);
  });

  it('never removes the book being opened: a file that does not fit is simply not kept', async () => {
    const { store, fake } = setup({ maxBytes: 1000 });
    await store.openBook({ bookId: 'mine', urls: [U('1.mp3'), U('2.mp3')] });
    expect(await store.write({ bookId: 'mine', url: U('1.mp3'), stamp: 'v1', blob: file(700) })).toBe(true);
    expect(await store.write({ bookId: 'mine', url: U('2.mp3'), stamp: 'v1', blob: file(700) })).toBe(false);
    expect(fake.has(U('1.mp3'))).toBe(true); // what was kept is still there
    expect((await store.inspect()).books.mine).toBeDefined();
  });

  it('a single file bigger than the whole limit is refused without throwing anything else away', async () => {
    const { store, fake } = setup({ maxBytes: 1000 });
    await store.openBook({ bookId: 'other', urls: [U('o.mp3')] });
    await store.write({ bookId: 'other', url: U('o.mp3'), stamp: 'v1', blob: file(500) });
    await store.openBook({ bookId: 'mine', urls: [U('huge.mp4')] });
    expect(await store.write({ bookId: 'mine', url: U('huge.mp4'), stamp: 'v1', blob: file(1500) })).toBe(false);
    expect(fake.has(U('o.mp3'))).toBe(true);
  });

  it('replacing a saved file near the limit counts the old one out: it fits, nothing else is thrown away', async () => {
    const { store, fake } = setup({ maxBytes: 1000 });
    await store.openBook({ bookId: 'other', urls: [U('o.mp3')] });
    await store.write({ bookId: 'other', url: U('o.mp3'), stamp: 'v1', blob: file(250) });
    await store.openBook({ bookId: 'mine', urls: [U('a.mp3')] });
    await store.write({ bookId: 'mine', url: U('a.mp3'), stamp: 'v1', blob: file(600) });

    // 250 + 700 = 950 fits only if the old 600 is not counted as well
    expect(await store.write({ bookId: 'mine', url: U('a.mp3'), stamp: 'v2', blob: file(700) })).toBe(true);
    expect(fake.has(U('o.mp3'))).toBe(true);
    expect((await store.read(U('a.mp3'), 'v2')).size).toBe(700);
  });

  it('the default limit is a few hundred megabytes', () => {
    expect(CMS_MEDIA_STORE.maxBytes).toBeGreaterThanOrEqual(300 * 1024 * 1024);
    expect(CMS_MEDIA_STORE.maxBytes).toBeLessThanOrEqual(1024 * 1024 * 1024);
  });
});

describe('a book that was edited', () => {
  it('files the book no longer uses are removed', async () => {
    const { store, fake } = setup();
    await store.openBook({ bookId: 'b1', urls: [U('a.mp3'), U('gone.mp3')] });
    await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(100) });
    await store.write({ bookId: 'b1', url: U('gone.mp3'), stamp: 'v1', blob: file(100) });

    await store.openBook({ bookId: 'b1', urls: [U('a.mp3'), U('new.mp3')] });

    expect(fake.has(U('gone.mp3'))).toBe(false);
    expect(fake.has(U('a.mp3'))).toBe(true);
    expect((await store.inspect()).files[U('gone.mp3')]).toBeUndefined();
  });

  it('a file another book also uses is kept when this book drops it', async () => {
    const { store, fake } = setup();
    await store.openBook({ bookId: 'b1', urls: [U('shared.mp3')] });
    await store.write({ bookId: 'b1', url: U('shared.mp3'), stamp: 'v1', blob: file(100) });
    await store.openBook({ bookId: 'b2', urls: [U('shared.mp3')] });

    await store.openBook({ bookId: 'b1', urls: [] });

    expect(fake.has(U('shared.mp3'))).toBe(true);
    expect(await store.read(U('shared.mp3'), 'v1')).not.toBeNull();
  });

  it('a file no book uses any more (left behind) is cleaned up the next time any book opens', async () => {
    const { store, fake } = setup();
    await store.openBook({ bookId: 'b1', urls: [U('a.mp3')] });
    await store.write({ bookId: 'b1', url: U('a.mp3'), stamp: 'v1', blob: file(100) });
    await store.openBook({ bookId: 'b2', urls: [] });
    await store.openBook({ bookId: 'b1', urls: [] });
    expect(fake.has(U('a.mp3'))).toBe(false);
  });
});

describe('the default store', () => {
  const original = globalThis.caches;
  afterEach(() => {
    if (original === undefined) delete globalThis.caches;
    else globalThis.caches = original;
  });

  it('keeps nothing where the page has no Cache Storage', () => {
    delete globalThis.caches;
    expect(getDefaultCmsBookMediaStore().available).toBe(false);
  });

  it('uses the page\'s Cache Storage when it has one, and is made once for it', () => {
    const fake = createFakeCacheStorage();
    globalThis.caches = fake.storage;
    const a = getDefaultCmsBookMediaStore();
    expect(a.available).toBe(true);
    expect(getDefaultCmsBookMediaStore()).toBe(a);
  });
});
