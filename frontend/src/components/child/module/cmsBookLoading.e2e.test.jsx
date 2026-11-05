/**
 * The built-in book, start to finish, as a child meets it: tap the book on the module page, the reader opens,
 * the book's sound and video download from a network the test controls (slow, failing, never answering), pages
 * lock and unlock Next, the media elements play the local copy, and closing frees everything.
 *
 * Real pieces: the module page's library section, the reader, the intro / content / demo / reward pages, the
 * loader, the plan, the hook. Stood in for: the server (book + files), the picture loader, the interactive page
 * (its drag-and-drop is tested on its own), the app shell around the section.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../config/theme';
import { createFakeImages, createFakeNetwork, createFakeObjectUrls, flushPromises } from '../../../test/fakeNetwork';

const world = vi.hoisted(() => ({
  book: null,
  fetchBook: null,
  images: null,
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
  default: ({ book, onCardClick }) => (
    <button type="button" onClick={onCardClick}>{book.title}</button>
  ),
}));
vi.mock('../common/html5Player', () => ({ default: () => null }));
vi.mock('../common/cmsCompletionDialog', () => ({ default: () => null }));
vi.mock('../common/html5CompletionHandler', () => ({
  completeHtml5Book: async (payload) => {
    world.completions.push(payload);
    return { data: {} };
  },
}));
// The drag-and-drop page is tested on its own; here it only needs to be able to answer correctly.
vi.mock('../../admin/common/cmsTest/InteractiveTest', () => ({
  default: ({ onCorrectDrop }) => (
    <div>
      <p>drag page</p>
      <button type="button" onClick={onCorrectDrop}>answer correctly</button>
    </div>
  ),
}));
// Pictures: the test decides when each one has loaded.
vi.mock('../../../utils/cmsPlayerMedia', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, preloadImage: (url) => world.images.preloadImage(url) };
});

import ChildModuleLibrary from './ChildModuleLibrary';

const C = (name) => `https://cdn.test/${name}`;

const bookFixture = () => ({
  id: 'cms1',
  version: 2,
  contentVersion: '2:2026-01-01T00:00:00.000Z',
  mediaManifest: {
    bookId: 'cms1',
    contentVersion: '2:2026-01-01T00:00:00.000Z',
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

const settle = (ms = 0) => act(async () => {
  if (ms) await vi.advanceTimersByTimeAsync(ms);
  await flushPromises();
});

const tapBook = () => fireEvent.click(screen.getByText('Built-in story'));

/** Open the book and let the server answer with it. */
const openBook = async () => {
  show();
  tapBook();
  await settle();
};

const picture = async (name) => { world.images.finish(C(name)); await settle(); };
// answers every request still waiting for that file (a book opened twice has asked twice)
const file = async (name, options = { size: 64 }) => { net.for(C(name)).filter((r) => !r.answered).forEach((r) => r.respond(options)); await settle(); };
const pending = (name) => net.for(C(name)).filter((r) => !r.answered && !r.aborted);
const nextButton = (label) => screen.getByRole('button', { name: label });

// The reader's code, as the module page would already have fetched it (the first load takes a while).
beforeAll(async () => {
  await import('../common/cmsPLayer');
}, 120000);

beforeEach(() => {
  net = createFakeNetwork();
  objectUrls = createFakeObjectUrls();
  audios = [];
  world.images = createFakeImages();
  world.book = bookFixture();
  world.completions = [];
  world.fetchBook = async () => ({ data: world.book });
  vi.stubGlobal('fetch', net.fetchImpl);
  vi.stubGlobal('Audio', FakeAudio);
  URL.createObjectURL = objectUrls.createObjectURL;
  URL.revokeObjectURL = objectUrls.revokeObjectURL;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Opening the book', () => {
  it('opens on page 1 as soon as page 1\'s files are in, while the later pages are still downloading', async () => {
    await openBook();

    // The server answered with the book: only the first page is waited for, with its own progress.
    expect(screen.getByText('Getting your book ready...')).toBeInTheDocument();
    expect(screen.getByText('0% loaded')).toBeInTheDocument();
    // ...and the whole book is already being fetched behind it, nearest page first
    expect(net.urls()).toEqual(expect.arrayContaining([C('music.mp3'), C('p1.mp3'), C('demo.mp4')]));

    await picture('cover.jpg');
    expect(screen.getByText('50% loaded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Play intro and continue' })).toBeNull();

    await file('music.mp3');

    expect(screen.getByRole('button', { name: 'Play intro and continue' })).toBeInTheDocument();
    expect(screen.queryByText('Getting your book ready...')).toBeNull();
    // the video of page 3 and everything else is still on its way: the child did not wait for it
    expect(pending('demo.mp4')).toHaveLength(1);
  });

  it('plays the intro music from the local copy, not from the internet', async () => {
    await openBook();
    await picture('cover.jpg');
    await file('music.mp3');

    expect(audios).toHaveLength(1);
    expect(audios[0].src).toMatch(/^blob:/);
    expect(audios[0].src).toBe(objectUrls.everMade[0].url);
    expect(audios[0].loop).toBe(true);
  });

  it('shows "Opening your book" while the pages are fetched, then the first-page wait', async () => {
    let arrive;
    world.fetchBook = () => new Promise((resolve) => { arrive = () => resolve({ data: world.book }); });
    show();
    tapBook();
    await settle();
    expect(screen.getByText('Opening your book...')).toBeInTheDocument();
    expect(net.requests).toHaveLength(0); // nothing to download before the book's list is known

    await act(async () => arrive());
    await settle();
    expect(screen.getByText('Getting your book ready...')).toBeInTheDocument();
    expect(net.requests.length).toBeGreaterThan(0);
  });

  it('a book with nothing to download opens at once', async () => {
    world.book = { id: 'cms1', pages: [{ pageId: 'p', type: 'cover', order: 1 }] };
    await openBook();
    expect(screen.getByRole('button', { name: 'Play intro and continue' })).toBeInTheDocument();
    expect(net.requests).toHaveLength(0);
  });

  it('a first page whose music cannot be downloaded still opens (it plays from the internet)', async () => {
    await openBook();
    await picture('cover.jpg');
    net.for(C('music.mp3'))[0].fail(); // e.g. the file host does not allow downloads from this site
    await settle();
    await settle(1500); // the one quiet retry
    net.for(C('music.mp3'))[1].fail();
    await settle();

    expect(screen.getByRole('button', { name: 'Play intro and continue' })).toBeInTheDocument();
    expect(audios[0].src).toBe(C('music.mp3'));
  });
});

describe('Next is held back until the next page is ready', () => {
  const reachIntro = async () => {
    await openBook();
    await picture('cover.jpg');
    await file('music.mp3');
  };

  it('is locked, with a spinner on the button, while page 2\'s files are on their way; a click does nothing', async () => {
    await reachIntro();
    const next = nextButton('Play intro and continue');

    expect(next).toBeDisabled();
    expect(next).toHaveAttribute('aria-busy', 'true');
    expect(within(next).getByRole('status', { name: 'Getting the next page ready' })).toBeInTheDocument();
    fireEvent.click(next);
    await settle();
    expect(screen.getByRole('button', { name: 'Play intro and continue' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to next page' })).toBeNull();
  });

  it('unlocks the moment the next page is ready, and opens it playing its sound from memory', async () => {
    await reachIntro();
    await picture('p1.jpg');
    expect(nextButton('Play intro and continue')).toBeDisabled(); // the sound is still missing
    await file('p1.mp3');

    const next = nextButton('Play intro and continue');
    expect(next).toBeEnabled();
    expect(next).not.toHaveAttribute('aria-busy');
    expect(within(next).queryByRole('status')).toBeNull();

    fireEvent.click(next);
    await settle();

    const content = document.querySelector('audio[aria-label="Content background audio"]');
    expect(content).not.toBeNull();
    expect(content.getAttribute('src')).toMatch(/^blob:/);
    expect(content.getAttribute('src')).not.toContain('cdn.test');
  });

  it('keeps downloading the next pages while the child reads, so Next is usually open already', async () => {
    await reachIntro();
    // page 2's files were requested while page 1 was still being waited for, not after
    expect(net.urls()).toContain(C('p1.mp3'));
    expect(world.images.open()).toContain(C('p1.jpg'));
  });

  it('a video page: Next onto it stays locked until its video is downloaded, then it plays that copy', async () => {
    await reachIntro();
    await picture('p1.jpg');
    await file('p1.mp3');
    fireEvent.click(nextButton('Play intro and continue'));
    await settle();

    // on the content page: the demo page (page 3) needs its picture and its video
    expect(nextButton('Go to next page')).toBeDisabled();
    await picture('demo.jpg');
    expect(nextButton('Go to next page')).toBeDisabled(); // the video is the slow part

    // mashing a locked button does nothing at all
    for (let i = 0; i < 8; i += 1) fireEvent.click(nextButton('Go to next page'));
    await settle();
    expect(document.querySelector('audio[aria-label="Content background audio"]')).not.toBeNull();

    await file('demo.mp4', { size: 5000, type: 'video/mp4' });
    expect(nextButton('Go to next page')).toBeEnabled();
    fireEvent.click(nextButton('Go to next page'));
    await settle();

    const video = document.querySelector('video[aria-label="Demo video preview"]');
    expect(video.getAttribute('src')).toMatch(/^blob:/);
  });

  it('after 12 s a video page opens anyway and plays from the internet; a copy arriving later does not swap it', async () => {
    await reachIntro();
    await picture('p1.jpg');
    await file('p1.mp3');
    fireEvent.click(nextButton('Play intro and continue'));
    await settle();
    await picture('demo.jpg');
    expect(nextButton('Go to next page')).toBeDisabled();

    await settle(11000);
    expect(nextButton('Go to next page')).toBeDisabled(); // 11 s: still within the budget
    await settle(1100);
    expect(nextButton('Go to next page')).toBeEnabled(); // 12 s passed

    fireEvent.click(nextButton('Go to next page'));
    await settle();
    const video = document.querySelector('video[aria-label="Demo video preview"]');
    expect(video.getAttribute('src')).toBe(C('demo.mp4'));

    await file('demo.mp4', { size: 5000, type: 'video/mp4' }); // it finally arrives, mid-play
    expect(document.querySelector('video[aria-label="Demo video preview"]').getAttribute('src')).toBe(C('demo.mp4'));
  });

  it('the demo page button is locked too while the page after it (the drag page) is still loading', async () => {
    await openBook();
    await picture('cover.jpg'); await file('music.mp3');
    await picture('p1.jpg'); await file('p1.mp3');
    await picture('demo.jpg'); await file('demo.mp4', { size: 5000, type: 'video/mp4' });
    fireEvent.click(nextButton('Play intro and continue')); await settle();
    fireEvent.click(nextButton('Go to next page')); await settle();

    const play = nextButton('Play demo and continue to interactive');
    expect(play).toBeDisabled();
    expect(play).toHaveAttribute('aria-busy', 'true');
    expect(within(play).getByRole('status', { name: 'Getting the next page ready' })).toBeInTheDocument();

    await picture('drag.jpg');
    expect(nextButton('Play demo and continue to interactive')).toBeEnabled();
  });

  it('an ordinary page waits 10 s, not 12', async () => {
    await reachIntro();
    await settle(9500);
    expect(nextButton('Play intro and continue')).toBeDisabled();
    await settle(600);
    expect(nextButton('Play intro and continue')).toBeEnabled();
  });

  it('a file that cannot be downloaded never holds the next page up', async () => {
    await reachIntro();
    await picture('p1.jpg');
    net.for(C('p1.mp3'))[0].respond({ status: 403 });
    await settle();
    await settle(1500);
    net.for(C('p1.mp3'))[1].respond({ status: 403 });
    await settle();

    expect(nextButton('Play intro and continue')).toBeEnabled();
    fireEvent.click(nextButton('Play intro and continue'));
    await settle();
    expect(document.querySelector('audio[aria-label="Content background audio"]').getAttribute('src')).toBe(C('p1.mp3'));
  });
});

describe('A correct answer while the next page is still loading', () => {
  const reachDragPage = async () => {
    await openBook();
    await picture('cover.jpg'); await file('music.mp3');
    await picture('p1.jpg'); await file('p1.mp3');
    await picture('demo.jpg'); await file('demo.mp4', { size: 5000, type: 'video/mp4' });
    await picture('drag.jpg');
    fireEvent.click(nextButton('Play intro and continue')); await settle();
    fireEvent.click(nextButton('Go to next page')); await settle();
    fireEvent.click(nextButton('Play demo and continue to interactive')); await settle();
    expect(screen.getByText('drag page')).toBeInTheDocument();
  };

  it('waits, says so, and moves on by itself when the reward page is ready', async () => {
    await reachDragPage();
    // the reward page needs its picture, its video and its cheer
    fireEvent.click(screen.getByRole('button', { name: 'answer correctly' }));
    await settle();

    expect(screen.getByText('drag page')).toBeInTheDocument(); // not skipped ahead
    expect(screen.getByRole('status')).toHaveTextContent('Getting the next page ready...');

    await picture('end.jpg');
    await file('reward.mp4', { size: 100, type: 'video/mp4' });
    await file('cheer.mp3');

    expect(screen.queryByText('drag page')).toBeNull();
    expect(document.querySelector('video[aria-label="Reward video preview"]').getAttribute('src')).toMatch(/^blob:/);
    expect(screen.queryByText('Getting the next page ready...')).toBeNull();
  });

  it('the reward cheer plays from the local copy', async () => {
    await reachDragPage();
    await picture('end.jpg');
    await file('reward.mp4', { size: 100, type: 'video/mp4' });
    await file('cheer.mp3');
    fireEvent.click(screen.getByRole('button', { name: 'answer correctly' }));
    await settle();

    const cheer = audios[audios.length - 1];
    expect(cheer.src).toMatch(/^blob:/);
    expect(cheer.src).toBe(objectUrls.everMade[objectUrls.everMade.length - 1].url);
  });

  it('moves on at once when the next page is already ready', async () => {
    await reachDragPage();
    await picture('end.jpg');
    await file('reward.mp4', { size: 100, type: 'video/mp4' });
    await file('cheer.mp3');

    fireEvent.click(screen.getByRole('button', { name: 'answer correctly' }));
    await settle();

    expect(screen.queryByText('drag page')).toBeNull();
    expect(screen.queryByText('Getting the next page ready...')).toBeNull();
  });

  it('the last page shows a usable Home button: its picture is the one bundled with the site, not fetched from the server', async () => {
    await reachDragPage();
    await picture('end.jpg');
    await file('reward.mp4', { size: 100, type: 'video/mp4' });
    await file('cheer.mp3');
    fireEvent.click(screen.getByRole('button', { name: 'answer correctly' }));
    await settle();

    const home = screen.getByRole('button', { name: 'Go home and finish book' });
    expect(home).toBeEnabled();
    const src = home.querySelector('img').getAttribute('src');
    expect(src).toMatch(/home\.png$/);
    expect(src).not.toMatch(/book-seeds|^https?:/); // nothing the server has to provide
  });

  it('and moves on after the wait budget even if the reward video never arrives', async () => {
    await reachDragPage();
    fireEvent.click(screen.getByRole('button', { name: 'answer correctly' }));
    await settle();
    expect(screen.getByText('drag page')).toBeInTheDocument();

    await settle(12100);

    expect(screen.queryByText('drag page')).toBeNull();
    expect(document.querySelector('video[aria-label="Reward video preview"]').getAttribute('src')).toBe(C('reward.mp4'));
  });
});

describe('Closing the book', () => {
  it('cancels what is still downloading and frees every local copy', async () => {
    await openBook();
    await picture('cover.jpg');
    await file('music.mp3');
    expect(objectUrls.live.size).toBe(1);
    const stillOpen = net.open().length;
    expect(stillOpen).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Close book player' }));
    await settle(50);

    expect(net.open()).toHaveLength(0); // every download was cut off
    expect(objectUrls.live.size).toBe(0); // and the copies were freed
  });

  it('leaving halfway through the wait for page 1 also stops everything', async () => {
    await openBook();
    fireEvent.click(screen.getByRole('button', { name: 'Close book player' }));
    await settle(50);
    expect(net.open()).toHaveLength(0);
  });

  it('reopening does not remember an earlier "waited long enough": the next page is held back again', async () => {
    await openBook();
    await picture('cover.jpg');
    await file('music.mp3');
    await settle(10100); // page 2 never arrived: the wait budget ran out and Next was let through
    expect(nextButton('Play intro and continue')).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Close book player' }));
    await settle(50);
    tapBook();
    await settle();
    await picture('cover.jpg');
    await file('music.mp3');

    expect(nextButton('Play intro and continue')).toBeDisabled();
  });

  it('opening the book again starts fresh downloads (nothing stale, nothing doubled)', async () => {
    await openBook();
    await picture('cover.jpg');
    await file('music.mp3');
    fireEvent.click(screen.getByRole('button', { name: 'Close book player' }));
    await settle(50);
    const before = net.requests.length;

    tapBook();
    await settle();
    await act(async () => { await settle(); });

    expect(net.requests.length).toBeGreaterThan(before);
    expect(net.open().filter((r) => r.url === C('music.mp3'))).toHaveLength(1);
    expect(screen.getByText('Getting your book ready...')).toBeInTheDocument();
  });

  it('closing the book reports the session and also frees everything', async () => {
    await openBook();
    await picture('cover.jpg');
    await file('music.mp3');
    fireEvent.click(screen.getByRole('button', { name: 'Close book player' }));
    await settle(50);
    expect(world.completions).toHaveLength(1);
    expect(objectUrls.live.size).toBe(0);
  });
});
