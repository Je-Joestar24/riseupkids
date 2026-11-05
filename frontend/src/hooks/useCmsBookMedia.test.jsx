/**
 * The hook that runs a book's downloads while the reader is open.
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createFakeImages, createFakeNetwork, createFakeObjectUrls, flushPromises } from '../test/fakeNetwork';

const world = vi.hoisted(() => ({ images: null }));
vi.mock('../utils/cmsPlayerMedia', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, preloadImage: (url) => world.images.preloadImage(url) };
});

import useCmsBookMedia from './useCmsBookMedia';

const U = (name) => `https://cdn.test/${name}`;
const pages = [
  { pageId: 'a', type: 'cover', imageUrl: U('a.jpg'), introBackgroundMusicUrl: U('a.mp3') },
  { pageId: 'b', type: 'content', imageUrl: U('b.jpg'), audioUrl: U('b.mp3') },
  { pageId: 'c', type: 'content', imageUrl: U('c.jpg'), audioUrl: U('c.mp3') },
];
const book = { id: 'b1', pages };

let net;
let urls;

beforeEach(() => {
  net = createFakeNetwork();
  urls = createFakeObjectUrls();
  world.images = createFakeImages();
  vi.stubGlobal('fetch', net.fetchImpl);
  URL.createObjectURL = urls.createObjectURL;
  URL.revokeObjectURL = urls.revokeObjectURL;
});
afterEach(() => vi.unstubAllGlobals());

const settle = () => act(async () => { await flushPromises(); });

describe('useCmsBookMedia', () => {
  it('does nothing at all when not enabled (the admin preview, or a caller that waits by itself)', async () => {
    const { result } = renderHook(() => useCmsBookMedia({ enabled: false, book, pages }));
    await settle();
    expect(net.requests).toHaveLength(0);
    expect(world.images.calls).toHaveLength(0);
    expect(result.current.enabled).toBe(false);
    expect(result.current.startReady).toBe(true);
    expect(result.current.isPageReady(1)).toBe(true);
    expect(result.current.resolve(U('a.mp3'))).toBe(U('a.mp3'));
  });

  it('is not "ready" on the very first render, before anything was asked for (no flash of an unready book)', () => {
    const { result } = renderHook(() => useCmsBookMedia({ enabled: true, book, pages }));
    expect(result.current.enabled).toBe(true);
    expect(result.current.startReady).toBe(false);
  });

  it('starts the downloads, reports the first page ready only when its files are in, and hands out local copies', async () => {
    const { result } = renderHook(() => useCmsBookMedia({ enabled: true, book, pages }));
    await settle();
    expect(net.urls()).toEqual(expect.arrayContaining([U('a.mp3'), U('b.mp3')]));
    expect(result.current.startReady).toBe(false);
    expect(result.current.startProgress).toBe(0);

    world.images.finish(U('a.jpg'));
    await settle();
    expect(result.current.startProgress).toBe(50);

    net.for(U('a.mp3'))[0].respond({ size: 12 });
    await settle();
    expect(result.current.startReady).toBe(true);
    expect(result.current.startProgress).toBe(100);
    expect(result.current.resolve(U('a.mp3'))).toBe('blob:fake/1');
    expect(result.current.resolve(U('b.mp3'))).toBe(U('b.mp3')); // not downloaded yet
    expect(result.current.isPageReady(1)).toBe(false);
    expect(result.current.summary).toMatchObject({ total: 6, ready: 2 });
  });

  it('follows the page the child is on: a jump ahead is downloaded first', async () => {
    const wide = Array.from({ length: 12 }, (_, i) => ({ pageId: `p${i}`, type: 'content', audioUrl: U(`s${i}.mp3`) }));
    const wideBook = { id: 'x', pages: wide };
    const { rerender } = renderHook(({ focus }) => useCmsBookMedia({ enabled: true, book: wideBook, pages: wide, focusPageIndex: focus }), {
      initialProps: { focus: 0 },
    });
    await settle();
    expect(net.openUrls()).toEqual(expect.arrayContaining([U('s0.mp3'), U('s5.mp3')]));
    expect(net.urls()).not.toContain(U('s11.mp3')); // only 6 at a time

    rerender({ focus: 11 });
    await settle();
    net.for(U('s0.mp3'))[0].respond(); // one slot frees up...
    await settle();
    expect(net.urls()).toContain(U('s11.mp3')); // ...and goes to the page the child is on now
  });

  it('stops the downloads and frees the copies when the reader closes (enabled turns off) or unmounts', async () => {
    const { result, rerender, unmount } = renderHook(({ enabled }) => useCmsBookMedia({ enabled, book, pages }), {
      initialProps: { enabled: true },
    });
    await settle();
    net.for(U('a.mp3'))[0].respond({ size: 5 });
    await settle();
    expect(urls.live.size).toBe(1);

    rerender({ enabled: false });
    await settle();
    expect(net.open()).toHaveLength(0);
    expect(urls.live.size).toBe(0);
    expect(result.current.enabled).toBe(false);

    rerender({ enabled: true });
    await settle();
    expect(net.open().length).toBeGreaterThan(0); // a fresh start
    unmount();
    await settle();
    expect(net.open()).toHaveLength(0);
  });

  it('a different book restarts everything for that book', async () => {
    const other = { id: 'b2', pages: [{ pageId: 'z', type: 'cover', imageUrl: U('z.jpg'), introBackgroundMusicUrl: U('z.mp3') }] };
    const { rerender } = renderHook(({ b }) => useCmsBookMedia({ enabled: true, book: b, pages: b.pages }), {
      initialProps: { b: book },
    });
    await settle();
    rerender({ b: other });
    await settle();
    expect(net.for(U('a.mp3'))[0].aborted).toBe(true);
    expect(net.openUrls()).toContain(U('z.mp3'));
  });

  it('survives React\'s development double-start: one live set of downloads, no copy leaked', async () => {
    const { result, unmount } = renderHook(() => useCmsBookMedia({ enabled: true, book, pages }), {
      wrapper: ({ children }) => <React.StrictMode>{children}</React.StrictMode>,
    });
    await settle();
    const live = net.open();
    expect(live.filter((r) => r.url === U('a.mp3')).length).toBe(1); // the first run's request was cut off, the second is live

    while (world.images.open().includes(U('a.jpg'))) world.images.finish(U('a.jpg')); // both starts asked for it
    net.open().filter((r) => r.url === U('a.mp3')).forEach((r) => r.respond({ size: 3 }));
    await settle();
    expect(result.current.startReady).toBe(true);
    unmount();
    await settle();
    expect(urls.live.size).toBe(0);
  });
});
