/**
 * The built-in book across visits, as a child meets it: the first time the book downloads and is kept on the device;
 * the next time it opens with no download at all (even offline); an edited book downloads again; a device that
 * cannot keep files changes nothing.
 *
 * Real pieces: the module page's library section, the reader, its pages, the downloader, the saving layer and the hook.
 * Stood in for: the server, the picture loader, the device's Cache Storage (a fake the test controls), the app shell.
 * Real timers are used because the saving layer does real asynchronous work.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../config/theme';
import { createFakeImages, createFakeNetwork, createFakeObjectUrls } from '../../../test/fakeNetwork';
import { createFakeCacheStorage, fakeResponse } from '../../../test/fakeCacheStorage';
import { createCmsBookMediaStore, unavailableCmsBookMediaStore } from '../../../utils/cmsBookMediaStore';

const world = vi.hoisted(() => ({
  book: null,
  fetchBook: null,
  images: null,
  store: null,
  completions: [],
}));

vi.mock('../../../hooks/courseProgressHook', () => ({
  useCourseProgress: () => ({ getChildBookReadings: vi.fn(async () => ({ success: true, data: [] })) }),
}));
vi.mock('../../../hooks/cmsBookPlayer', () => ({
  default: () => ({ loadPlayableBookById: (id) => world.fetchBook(id) }),
}));
vi.mock('../../../utils/playerFullscreen', () => ({
  enterPlayerFullscreen: async () => true,
  exitPlayerFullscreen: async () => {},
}));
vi.mock('./ChildModuleCards', () => ({
  default: ({ book, onCardClick }) => <button type="button" onClick={onCardClick}>{book.title}</button>,
}));
vi.mock('../common/html5Player', () => ({ default: () => null }));
vi.mock('../common/cmsCompletionDialog', () => ({ default: () => null }));
vi.mock('../common/html5CompletionHandler', () => ({
  completeHtml5Book: async (payload) => {
    world.completions.push(payload);
    return { data: {} };
  },
}));
vi.mock('../../admin/common/cmsTest/InteractiveTest', () => ({ default: () => <div>drag page</div> }));
vi.mock('../../../utils/cmsPlayerMedia', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, preloadImage: (url) => world.images.preloadImage(url) };
});
// The device's storage: the test decides what this page load's storage is.
vi.mock('../../../utils/cmsBookMediaStore', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, getDefaultCmsBookMediaStore: () => world.store };
});

import ChildModuleLibrary from './ChildModuleLibrary';

const C = (name) => `https://cdn.test/${name}`;
const MEDIA = ['music.mp3', 'p1.mp3', 'demo.mp4', 'reward.mp4', 'cheer.mp3'];

const bookFixture = (contentVersion = '2:2026-01-01T00:00:00.000Z') => ({
  id: 'cms1',
  version: 2,
  contentVersion,
  mediaManifest: {
    bookId: 'cms1',
    contentVersion,
    assets: [
      { key: 'pages.cover.audio', url: C('music.mp3'), kind: 'audio', updatedAt: null, mediaId: 'm1' },
      { key: 'pages.demo.video', url: C('demo.mp4'), kind: 'video', updatedAt: null, mediaId: 'm2' },
      { key: 'pages.end.video', url: C('reward.mp4'), kind: 'video', updatedAt: null, mediaId: 'm3' },
    ],
  },
  pages: [
    { pageId: 'cover', type: 'cover', order: 1, imageUrl: C('cover.jpg'), introBackgroundMusicUrl: C('music.mp3') },
    { pageId: 'p1', type: 'content', order: 2, imageUrl: C('p1.jpg'), audioUrl: C('p1.mp3') },
    { pageId: 'demo', type: 'activity_demo_video', order: 3, imageUrl: C('demo.jpg'), videoUrl: C('demo.mp4') },
    { pageId: 'drag', type: 'activity_drag_2x1', order: 4, imageUrl: C('drag.jpg') },
    { pageId: 'end', type: 'end', order: 5, imageUrl: C('end.jpg'), videoUrl: C('reward.mp4'), rewardAudioUrl: C('cheer.mp3') },
  ],
});

const libraryBook = { _id: 'b1', title: 'Built-in story', packageType: 'builtin', cmsBookId: 'cms1' };

let net;
let objectUrls;
let audios;
let device;

class FakeAudio {
  constructor(src) {
    this.src = src;
    this.readyState = 0;
    this.loop = false;
    audios.push(this);
  }
  play() { return Promise.resolve(); }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
  setAttribute() {}
}

const wait = (ms = 40) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });

const show = () =>
  render(
    <ThemeProvider theme={theme}>
      <Provider store={configureStore({ reducer: { ui: (state = {}) => state } })}>
        <MemoryRouter initialEntries={['/child/kid1/journey/c1']}>
          <Routes>
            <Route path="/child/:id/journey/:courseId" element={<ChildModuleLibrary books={[libraryBook]} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </ThemeProvider>
  );

const newStore = () =>
  createCmsBookMediaStore({ cachesImpl: device.storage, makeResponse: fakeResponse, origin: 'https://app.test' });

/** A new page load of the website on the same device: a fresh network and fresh memory, the same saved files. */
const freshPageLoad = ({ store = newStore() } = {}) => {
  cleanup();
  net = createFakeNetwork();
  objectUrls = createFakeObjectUrls();
  audios = [];
  world.images = createFakeImages();
  world.store = store;
  vi.stubGlobal('fetch', net.fetchImpl);
  URL.createObjectURL = objectUrls.createObjectURL;
  URL.revokeObjectURL = objectUrls.revokeObjectURL;
};

const openBook = async () => {
  show();
  fireEvent.click(screen.getByText('Built-in story'));
  await wait();
};

const finishPictures = async () => {
  world.images.open().forEach((url) => world.images.finish(url));
  await wait();
};

// Videos download one after another, so keep answering until nothing more is asked.
const answerEverythingAsked = async (options = { size: 64 }) => {
  for (let round = 0; round < 6; round += 1) {
    const waiting = net.requests.filter((r) => !r.answered && !r.aborted);
    if (!waiting.length && round > 0) break;
    waiting.forEach((r) => r.respond(options));
    // eslint-disable-next-line no-await-in-loop
    await wait();
  }
};

const closeBook = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Close book player' }));
  await wait(60);
  await world.store.whenSettled();
};

const nextButton = (label) => screen.getByRole('button', { name: label });

beforeAll(async () => {
  await import('../common/cmsPLayer');
}, 120000);

beforeEach(() => {
  device = createFakeCacheStorage();
  world.book = bookFixture();
  world.completions = [];
  world.fetchBook = async () => ({ data: world.book });
  freshPageLoad();
  vi.stubGlobal('Audio', FakeAudio);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** the first visit: the child opens the book, everything arrives, the child closes it */
const firstVisit = async () => {
  await openBook();
  await finishPictures();
  await answerEverythingAsked();
  await closeBook();
};

describe('first visit', () => {
  it('downloads the book and keeps its sound and video on the device', async () => {
    await firstVisit();

    expect(net.urls().sort()).toEqual(expect.arrayContaining(MEDIA.map(C).sort()));
    expect(device.keptUrls().sort()).toEqual(MEDIA.map(C).sort());
    const index = await world.store.inspect();
    expect(index.books.cms1.urls.sort()).toEqual(MEDIA.map(C).sort());
    expect(index.files[C('demo.mp4')].stamp).toBe('2:2026-01-01T00:00:00.000Z');
  });

  it('the child waits no longer than before: the book opens on page 1 and keeping files happens behind it', async () => {
    await openBook();
    await finishPictures();
    net.for(C('music.mp3'))[0].respond({ size: 64 });
    await wait();

    expect(screen.getByRole('button', { name: 'Play intro and continue' })).toBeInTheDocument();
    expect(device.keptUrls()).toContain(C('music.mp3'));
  });
});

describe('next visit', () => {
  it('opens with no download of any sound or video, and plays the device\'s copy', async () => {
    await firstVisit();

    freshPageLoad();
    await openBook();
    await finishPictures(); // pictures come from the browser's own cache; this layer does not keep them
    await wait();

    expect(net.requests).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Play intro and continue' })).toBeInTheDocument();
    expect(audios).toHaveLength(1);
    expect(audios[0].src).toMatch(/^blob:/);
  });

  it('Next is not locked: every page was already on the device', async () => {
    await firstVisit();

    freshPageLoad();
    await openBook();
    await finishPictures();
    await wait();

    expect(nextButton('Play intro and continue')).toBeEnabled();
  });

  it('opens even with the internet completely off', async () => {
    await firstVisit();

    freshPageLoad();
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')));
    await openBook();
    await finishPictures();
    await wait();

    expect(screen.getByRole('button', { name: 'Play intro and continue' })).toBeInTheDocument();
    expect(nextButton('Play intro and continue')).toBeEnabled();
  });

  it('closing the book frees the memory copies but leaves the saved files', async () => {
    await firstVisit();

    freshPageLoad();
    await openBook();
    await finishPictures();
    await wait();
    expect(objectUrls.live.size).toBeGreaterThan(0);

    await closeBook();
    expect(objectUrls.live.size).toBe(0);
    expect(device.keptUrls().sort()).toEqual(MEDIA.map(C).sort());
  });

  it('visiting several times never downloads again', async () => {
    await firstVisit();
    for (let i = 0; i < 3; i += 1) {
      freshPageLoad();
      // eslint-disable-next-line no-await-in-loop
      await openBook();
      // eslint-disable-next-line no-await-in-loop
      await finishPictures();
      // eslint-disable-next-line no-await-in-loop
      await wait();
      expect(net.requests).toHaveLength(0);
      // eslint-disable-next-line no-await-in-loop
      await closeBook();
    }
  });
});

describe('an edited book', () => {
  it('is downloaded again after the server says the book changed, and the new copies are kept', async () => {
    await firstVisit();

    world.book = bookFixture('3:2026-02-02T00:00:00.000Z');
    freshPageLoad();
    await openBook();
    await finishPictures();
    await answerEverythingAsked();
    expect(net.urls()).toEqual(expect.arrayContaining(MEDIA.map(C)));
    await closeBook();

    const index = await world.store.inspect();
    expect(index.files[C('demo.mp4')].stamp).toBe('3:2026-02-02T00:00:00.000Z');
    expect(index.files[C('music.mp3')].stamp).toBe('3:2026-02-02T00:00:00.000Z');
  });

  it('a file the server dates newer is the only one downloaded again', async () => {
    await firstVisit();

    const edited = bookFixture('3:2026-02-02T00:00:00.000Z');
    edited.mediaManifest.assets = edited.mediaManifest.assets.map((a) => ({ ...a, updatedAt: '2026-01-01T00:00:00.000Z' }));
    world.book = edited;
    // an earlier visit saved these with the version as stamp; give the saved ones the same date stamps
    // by visiting once with the dated book, then editing one file
    freshPageLoad();
    await openBook();
    await finishPictures();
    await answerEverythingAsked();
    await closeBook();

    const editedAgain = bookFixture('4:2026-03-03T00:00:00.000Z');
    editedAgain.mediaManifest.assets = editedAgain.mediaManifest.assets.map((a) => ({
      ...a,
      updatedAt: a.key === 'pages.demo.video' ? '2026-03-03T00:00:00.000Z' : '2026-01-01T00:00:00.000Z',
    }));
    world.book = editedAgain;
    freshPageLoad();
    await openBook();
    await finishPictures();
    await wait();

    // the demo video has a newer date and is asked for again; the unchanged ones are not
    expect(net.urls()).toContain(C('demo.mp4'));
    expect(net.urls()).not.toContain(C('music.mp3'));
    expect(net.urls()).not.toContain(C('reward.mp4'));
  });
});

describe('a device that cannot keep files', () => {
  it('a page with no Cache Storage works exactly as before and keeps nothing', async () => {
    freshPageLoad({ store: unavailableCmsBookMediaStore });
    await openBook();
    await finishPictures();
    net.for(C('music.mp3'))[0].respond({ size: 64 });
    await wait();

    expect(screen.getByRole('button', { name: 'Play intro and continue' })).toBeInTheDocument();
    expect(device.keptUrls()).toEqual([]);

    // and the next visit downloads again
    await closeBook();
    freshPageLoad({ store: unavailableCmsBookMediaStore });
    await openBook();
    expect(net.urls()).toContain(C('music.mp3'));
  });

  it('a full device: the book still works and what did not fit is simply downloaded next time', async () => {
    device = createFakeCacheStorage({ quotaBytes: 10 });
    freshPageLoad();
    await openBook();
    await finishPictures();
    await answerEverythingAsked();

    expect(screen.getByRole('button', { name: 'Play intro and continue' })).toBeInTheDocument();
    expect(audios[0].src).toMatch(/^blob:/);
    expect(device.keptUrls()).toEqual([]);

    await closeBook();
    freshPageLoad();
    await openBook();
    expect(net.urls()).toContain(C('music.mp3'));
  });

  it('storage that cannot even be opened: the book still works', async () => {
    device = createFakeCacheStorage({ failOpen: true });
    freshPageLoad();
    await openBook();
    await finishPictures();
    net.for(C('music.mp3'))[0].respond({ size: 64 });
    await wait();
    expect(screen.getByRole('button', { name: 'Play intro and continue' })).toBeInTheDocument();
  });
});
