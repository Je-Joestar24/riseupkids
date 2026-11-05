/**
 * The book's downloader, tested against a network the test controls: slow files, failed files, files the server
 * will not share, files that are too big, files that stall, the child moving ahead, and closing half-way.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCmsBookMediaLoader, MEDIA_STATE } from './cmsBookMediaLoader';
import { createFakeImages, createFakeNetwork, createFakeObjectUrls, flushPromises, hugeChunk } from '../test/fakeNetwork';

const U = (name) => `https://cdn.test/${name}`;

const asset = (name, pageIndex, kind) => ({ url: U(name), kind, pageIndex, key: null, updatedAt: null, streamOnly: false });
const planOf = (assets, pageCount) => {
  const count = pageCount ?? Math.max(...assets.map((a) => a.pageIndex), 0) + 1;
  const pageUrls = Array.from({ length: count }, () => []);
  assets.forEach((a) => { if (a.pageIndex < count) pageUrls[a.pageIndex].push(a.url); });
  return { assets, pageUrls };
};
const typedPages = (types) => types.map((type, i) => ({ pageId: `p${i}`, type }));

const setup = (assets, { pages = [], pageCount, ...limits } = {}) => {
  const net = createFakeNetwork();
  const images = createFakeImages();
  const urls = createFakeObjectUrls();
  const loader = createCmsBookMediaLoader({
    plan: planOf(assets, pageCount),
    pages,
    fetchImpl: net.fetchImpl,
    preloadImage: images.preloadImage,
    createObjectURL: urls.createObjectURL,
    revokeObjectURL: urls.revokeObjectURL,
    ...limits,
  });
  return { loader, net, images, urls };
};

afterEach(() => vi.useRealTimers());

describe('downloading for real', () => {
  it('nothing is requested until it is started', async () => {
    const { loader, net } = setup([asset('a.mp3', 0, 'audio')]);
    await flushPromises();
    expect(net.requests).toHaveLength(0);
    loader.start();
    await flushPromises();
    expect(net.requests).toHaveLength(1);
  });

  it('a sound is fetched whole (a real GET asking for permission, no cookies) and played from memory afterwards', async () => {
    const { loader, net, urls } = setup([asset('a.mp3', 0, 'audio')]);
    loader.start();
    await flushPromises();

    const request = net.requests[0];
    expect(request.url).toBe(U('a.mp3'));
    expect(request.init).toMatchObject({ mode: 'cors', credentials: 'omit' });
    expect(request.init.method).toBeUndefined(); // not the old HEAD request that downloaded nothing
    expect(loader.getState(U('a.mp3'))).toBe(MEDIA_STATE.LOADING);
    expect(loader.getSrc(U('a.mp3'))).toBe(U('a.mp3')); // still the internet address while it downloads

    request.respond({ size: 2048 });
    await flushPromises();

    expect(loader.getState(U('a.mp3'))).toBe(MEDIA_STATE.READY);
    expect(urls.everMade).toEqual([{ url: 'blob:fake/1', size: 2048 }]);
    expect(loader.getSrc(U('a.mp3'))).toBe('blob:fake/1');
    expect(loader.summary()).toMatchObject({ total: 1, ready: 1, heldBytes: 2048 });
  });

  it('a video is fetched whole too', async () => {
    const { loader, net } = setup([asset('v.mp4', 0, 'video')]);
    loader.start();
    await flushPromises();
    net.requests[0].respond({ size: 5000, type: 'video/mp4' });
    await flushPromises();
    expect(loader.getSrc(U('v.mp4'))).toMatch(/^blob:/);
  });

  it('a picture is loaded with the picture loader (decoded ahead), not downloaded as a file', async () => {
    const { loader, net, images } = setup([asset('i.jpg', 0, 'image')]);
    loader.start();
    await flushPromises();

    expect(net.requests).toHaveLength(0);
    expect(images.open()).toEqual([U('i.jpg')]);
    images.finish(U('i.jpg'));
    await flushPromises();
    expect(loader.getState(U('i.jpg'))).toBe(MEDIA_STATE.READY);
    expect(loader.getSrc(U('i.jpg'))).toBe(U('i.jpg')); // the browser keeps it; the same address is used
  });

  it('an embed is never fetched and counts as ready', async () => {
    const embed = { ...asset('e', 0, 'video'), url: 'https://iframe.mediadelivery.net/embed/1/x', streamOnly: true };
    const { loader, net } = setup([embed]);
    loader.start();
    await flushPromises();
    expect(net.requests).toHaveLength(0);
    expect(loader.getState(embed.url)).toBe(MEDIA_STATE.STREAM);
    expect(loader.isPageReady(0)).toBe(true);
  });

  it('an address it does not know is handed back unchanged', () => {
    const { loader } = setup([]);
    expect(loader.getSrc('https://elsewhere.test/x.mp3')).toBe('https://elsewhere.test/x.mp3');
    expect(loader.getState('https://elsewhere.test/x.mp3')).toBeNull();
  });

  it('start twice does not request twice', async () => {
    const { loader, net } = setup([asset('a.mp3', 0, 'audio')]);
    loader.start();
    loader.start();
    await flushPromises();
    expect(net.requests).toHaveLength(1);
  });
});

describe('the order and the pace', () => {
  it('the page the child is on goes first, then the next, then the rest', async () => {
    const { loader, net } = setup(
      [asset('p3.mp3', 3, 'audio'), asset('p1.mp3', 1, 'audio'), asset('p0.mp3', 0, 'audio'), asset('p2.mp3', 2, 'audio')],
      { smallConcurrency: 1 }
    );
    loader.start();
    await flushPromises();
    const order = [];
    for (let i = 0; i < 4; i += 1) {
      order.push(net.open()[0].url);
      net.open()[0].respond();
      // eslint-disable-next-line no-await-in-loop
      await flushPromises();
    }
    expect(order).toEqual([U('p0.mp3'), U('p1.mp3'), U('p2.mp3'), U('p3.mp3')]);
  });

  it('at most 6 small files at once; the 7th starts when one finishes', async () => {
    const assets = Array.from({ length: 9 }, (_, i) => asset(`s${i}.mp3`, 0, 'audio'));
    const { loader, net } = setup(assets);
    loader.start();
    await flushPromises();
    expect(net.open()).toHaveLength(6);

    net.open()[0].respond();
    await flushPromises();
    expect(net.requests).toHaveLength(7);
    expect(net.open()).toHaveLength(6);
  });

  it('a long queue of videos never uses more than one slot while all of them are far away', async () => {
    const pages = typedPages(['content', 'content', 'content', 'content', 'content', 'activity_demo_video', 'activity_demo_video', 'activity_demo_video']);
    const { loader, net } = setup(
      [asset('v5.mp4', 5, 'video'), asset('v6.mp4', 6, 'video'), asset('v7.mp4', 7, 'video')],
      { pages, pageCount: 8 }
    );
    loader.start();
    await flushPromises();
    expect(net.open()).toHaveLength(1);
    expect(net.open()[0].url).toBe(U('v5.mp4'));
  });

  it('videos never block pictures and sound', async () => {
    const pages = typedPages(['content', 'activity_demo_video']);
    const { loader, net, images } = setup(
      [asset('v1.mp4', 1, 'video'), asset('a0.mp3', 0, 'audio'), asset('i0.jpg', 0, 'image')],
      { pages }
    );
    loader.start();
    await flushPromises();
    expect(net.openUrls()).toEqual(expect.arrayContaining([U('v1.mp4'), U('a0.mp3')]));
    expect(images.open()).toEqual([U('i0.jpg')]);
  });

  it('a video for the page Next opens gets a second slot even while a far video is still downloading', async () => {
    const pages = typedPages(['content', 'activity_demo_video', 'content', 'content', 'content', 'content', 'content', 'activity_demo_video', 'activity_demo_video']);
    const { loader, net } = setup(
      [asset('next.mp4', 1, 'video'), asset('far.mp4', 7, 'video'), asset('farther.mp4', 8, 'video')],
      { pages, pageCount: 9 }
    );
    // The child is on page 5: page 7's video (two pages ahead) is the nearest pending one and starts.
    loader.setFocus(5);
    loader.start();
    await flushPromises();
    expect(net.openUrls()).toEqual([U('far.mp4')]);

    // The child goes back to page 0: page 1's video is now "next" and must not wait behind the far one.
    loader.setFocus(0);
    await flushPromises();
    expect(net.openUrls().sort()).toEqual([U('far.mp4'), U('next.mp4')].sort());
    // ...but a further far video does not get a third slot
    expect(net.requests.map((r) => r.url)).not.toContain(U('farther.mp4'));
  });

  it('moving ahead re-orders what is still waiting', async () => {
    const { loader, net } = setup(
      [asset('p0.mp3', 0, 'audio'), asset('p1.mp3', 1, 'audio'), asset('p2.mp3', 2, 'audio'), asset('p5.mp3', 5, 'audio'), asset('p6.mp3', 6, 'audio')],
      { smallConcurrency: 1 }
    );
    loader.start();
    await flushPromises();
    expect(net.openUrls()).toEqual([U('p0.mp3')]);

    loader.setFocus(5);
    net.open()[0].respond();
    await flushPromises();
    expect(net.openUrls()).toEqual([U('p5.mp3')]); // not p1: the child is on page 5 now
    net.open()[0].respond();
    await flushPromises();
    expect(net.openUrls()).toEqual([U('p6.mp3')]);
  });
});

describe('readiness of a page', () => {
  it('a page is ready only when every file it needs is settled; pages with no files, and unknown files, are ready', async () => {
    const { loader, net, images } = setup(
      [asset('i0.jpg', 0, 'image'), asset('a0.mp3', 0, 'audio'), asset('a2.mp3', 2, 'audio')],
      { pageCount: 4 }
    );
    expect(loader.isPageReady(1)).toBe(true); // nothing to wait for
    expect(loader.isPageReady(3)).toBe(true);
    expect(loader.isPageReady(99)).toBe(true);
    expect(loader.getPageProgress(1)).toBe(100);

    loader.start();
    await flushPromises();
    expect(loader.isPageReady(0)).toBe(false);
    expect(loader.getPageProgress(0)).toBe(0);

    images.finish(U('i0.jpg'));
    await flushPromises();
    expect(loader.isPageReady(0)).toBe(false); // the sound is still on its way
    expect(loader.getPageProgress(0)).toBe(50);

    net.for(U('a0.mp3'))[0].respond();
    await flushPromises();
    expect(loader.isPageReady(0)).toBe(true);
    expect(loader.getPageProgress(0)).toBe(100);
    expect(loader.isPageReady(2)).toBe(false);
  });
});

describe('when a file cannot be had', () => {
  it('is tried once more, and then given up on; the page is not held up and plays it from the internet', async () => {
    vi.useFakeTimers();
    const { loader, net, urls } = setup([asset('a.mp3', 0, 'audio')]);
    loader.start();
    await flushPromises();

    net.requests[0].fail(); // e.g. the server sends no CORS permission
    await flushPromises();
    expect(loader.getState(U('a.mp3'))).toBe(MEDIA_STATE.PENDING);
    expect(loader.isPageReady(0)).toBe(false); // retrying: not given up yet
    expect(net.requests).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1500);
    await flushPromises();
    expect(net.requests).toHaveLength(2);
    net.requests[1].fail();
    await flushPromises();

    expect(loader.getState(U('a.mp3'))).toBe(MEDIA_STATE.FAILED);
    expect(loader.isPageReady(0)).toBe(true);
    expect(loader.getSrc(U('a.mp3'))).toBe(U('a.mp3'));
    expect(urls.everMade).toHaveLength(0);
    expect(loader.summary().failed).toEqual([U('a.mp3')]);
  });

  it('a second try that works is used', async () => {
    vi.useFakeTimers();
    const { loader, net } = setup([asset('a.mp3', 0, 'audio')]);
    loader.start();
    await flushPromises();
    net.requests[0].fail();
    await vi.advanceTimersByTimeAsync(1500);
    await flushPromises();
    net.requests[1].respond({ size: 10 });
    await flushPromises();
    expect(loader.getState(U('a.mp3'))).toBe(MEDIA_STATE.READY);
    expect(loader.summary().failed).toEqual([]);
  });

  it('a server error (404, 500) counts as a failure, not as a file', async () => {
    vi.useFakeTimers();
    const { loader, net, urls } = setup([asset('a.mp3', 0, 'audio')], { retries: 0 });
    loader.start();
    await flushPromises();
    net.requests[0].respond({ status: 404, size: 30 });
    await flushPromises();
    expect(loader.getState(U('a.mp3'))).toBe(MEDIA_STATE.FAILED);
    expect(urls.everMade).toHaveLength(0);
  });

  it('a picture that does not load is given up on too, without holding the page', async () => {
    vi.useFakeTimers();
    const { loader, images } = setup([asset('i.jpg', 0, 'image')], { retries: 0 });
    loader.start();
    await flushPromises();
    images.fail(U('i.jpg'));
    await flushPromises();
    expect(loader.getState(U('i.jpg'))).toBe(MEDIA_STATE.FAILED);
    expect(loader.isPageReady(0)).toBe(true);
  });

  it('while one file waits to retry, the others keep going', async () => {
    vi.useFakeTimers();
    const { loader, net } = setup([asset('bad.mp3', 0, 'audio'), asset('good.mp3', 0, 'audio')]);
    loader.start();
    await flushPromises();
    net.for(U('bad.mp3'))[0].fail();
    net.for(U('good.mp3'))[0].respond();
    await flushPromises();
    expect(loader.getState(U('good.mp3'))).toBe(MEDIA_STATE.READY);
  });

  it('a file that stops sending is cut off after 30 s and tried again', async () => {
    vi.useFakeTimers();
    const { loader, net } = setup([asset('slow.mp3', 0, 'audio')]);
    loader.start();
    await flushPromises();
    expect(net.requests).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(30000);
    await flushPromises();
    expect(net.requests[0].aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(1500);
    await flushPromises();
    expect(net.requests).toHaveLength(2); // the retry
  });
});

describe('files too big to hold in memory', () => {
  it('a file whose size is announced above 100 MB is not downloaded: it is streamed', async () => {
    const { loader, net, urls } = setup([asset('big.mp4', 0, 'video')]);
    loader.start();
    await flushPromises();
    net.requests[0].respond({ size: 1, headers: { 'content-length': 150 * 1024 * 1024 } });
    await flushPromises();

    expect(net.requests[0].aborted).toBe(true); // the body was never read
    expect(loader.getState(U('big.mp4'))).toBe(MEDIA_STATE.STREAM);
    expect(loader.getSrc(U('big.mp4'))).toBe(U('big.mp4'));
    expect(loader.isPageReady(0)).toBe(true);
    expect(urls.everMade).toHaveLength(0);
  });

  it('a file that does not announce its size is cut off as soon as it passes the limit', async () => {
    const { loader, net, urls } = setup([asset('big.mp4', 0, 'video')]);
    loader.start();
    await flushPromises();
    net.requests[0].respond({ chunks: [hugeChunk(60 * 1024 * 1024), hugeChunk(60 * 1024 * 1024), hugeChunk(1)] });
    await flushPromises();

    expect(net.requests[0].aborted).toBe(true);
    expect(loader.getState(U('big.mp4'))).toBe(MEDIA_STATE.STREAM);
    expect(urls.everMade).toHaveLength(0);
  });

  it('a file just under the limit is kept', async () => {
    const { loader, net } = setup([asset('ok.mp4', 0, 'video')]);
    loader.start();
    await flushPromises();
    net.requests[0].respond({ size: 4, headers: { 'content-length': 99 * 1024 * 1024 } });
    await flushPromises();
    expect(loader.getState(U('ok.mp4'))).toBe(MEDIA_STATE.READY);
  });

  it('once the book as a whole would hold too much, further big files are streamed', async () => {
    const { loader, net } = setup(
      [asset('a.mp4', 0, 'video'), asset('b.mp4', 1, 'video')],
      { maxFileBytes: 1000, maxTotalBytes: 1500, videoConcurrency: 1, pages: typedPages(['activity_demo_video', 'activity_demo_video']) }
    );
    loader.start();
    await flushPromises();
    net.for(U('a.mp4'))[0].respond({ size: 900 });
    await flushPromises();
    expect(loader.getState(U('a.mp4'))).toBe(MEDIA_STATE.READY);

    net.for(U('b.mp4'))[0].respond({ size: 800, headers: { 'content-length': 800 } });
    await flushPromises();
    expect(loader.getState(U('b.mp4'))).toBe(MEDIA_STATE.STREAM); // 900 + 800 > 1500
    expect(loader.summary().heldBytes).toBe(900);
  });
});

describe('closing the book', () => {
  it('stops every download, frees every local copy, and ignores answers that arrive late', async () => {
    const { loader, net, urls, images } = setup([
      asset('done.mp3', 0, 'audio'),
      asset('going.mp3', 0, 'audio'),
      asset('queued.mp3', 1, 'audio'),
      asset('i.jpg', 0, 'image'),
    ], { smallConcurrency: 2 });
    loader.start();
    await flushPromises();
    net.for(U('done.mp3'))[0].respond({ size: 10 });
    await flushPromises();
    expect(urls.live.size).toBe(1);
    const requestsBefore = net.requests.length;

    loader.cancel();
    await flushPromises();

    net.open().forEach((r) => r.respond({ size: 10 })); // answers that come too late
    images.finish(U('i.jpg'));
    await flushPromises();

    expect(net.requests.filter((r) => r.url === U('going.mp3'))[0].aborted).toBe(true);
    expect(urls.live.size).toBe(0); // the copy of done.mp3 was freed
    expect(urls.everMade).toHaveLength(1); // and nothing new was made afterwards
    expect(net.requests).toHaveLength(requestsBefore); // the queue was not started
    expect(loader.getSrc(U('done.mp3'))).toBe(U('done.mp3'));
    expect(loader.summary().heldBytes).toBe(0);
  });

  it('a download that still finishes after closing is thrown away: no local copy is made, none is left behind', async () => {
    const net = createFakeNetwork({ ignoreAbort: true });
    const urls = createFakeObjectUrls();
    const loader = createCmsBookMediaLoader({
      plan: planOf([asset('late.mp3', 0, 'audio')]),
      fetchImpl: net.fetchImpl,
      preloadImage: createFakeImages().preloadImage,
      createObjectURL: urls.createObjectURL,
      revokeObjectURL: urls.revokeObjectURL,
    });
    loader.start();
    await flushPromises();
    loader.cancel();
    net.requests[0].respond({ size: 50 });
    await flushPromises();

    expect(urls.everMade).toHaveLength(0);
    expect(urls.live.size).toBe(0);
    expect(loader.summary().heldBytes).toBe(0);
    expect(loader.getSrc(U('late.mp3'))).toBe(U('late.mp3'));
  });

  it('a file waiting to retry is not retried after closing', async () => {
    vi.useFakeTimers();
    const { loader, net } = setup([asset('a.mp3', 0, 'audio')]);
    loader.start();
    await flushPromises();
    net.requests[0].fail();
    await flushPromises();
    loader.cancel();
    await vi.advanceTimersByTimeAsync(5000);
    await flushPromises();
    expect(net.requests).toHaveLength(1);
  });

  it('cannot be started again, and closing twice is harmless', async () => {
    const { loader, net, urls } = setup([asset('a.mp3', 0, 'audio')]);
    loader.start();
    await flushPromises();
    net.requests[0].respond({ size: 3 });
    await flushPromises();
    loader.cancel();
    loader.cancel();
    loader.start();
    loader.setFocus(3);
    await flushPromises();
    expect(net.requests).toHaveLength(1);
    expect(urls.live.size).toBe(0);
  });
});

describe('telling the screen something changed', () => {
  it('the snapshot changes whenever a file changes state, and not otherwise', async () => {
    const { loader, net } = setup([asset('a.mp3', 0, 'audio')]);
    const seen = [];
    const unsubscribe = loader.subscribe(() => seen.push(loader.getSnapshot()));
    const first = loader.getSnapshot();
    expect(loader.getSnapshot()).toBe(first); // stable between changes

    loader.start();
    await flushPromises();
    net.requests[0].respond({ size: 3 });
    await flushPromises();

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(loader.getSnapshot()).not.toBe(first);

    unsubscribe();
    const count = seen.length;
    loader.cancel();
    expect(seen).toHaveLength(count);
  });
});
