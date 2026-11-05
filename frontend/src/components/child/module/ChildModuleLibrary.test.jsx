/**
 * The books section of the course page. The built-in book reader is a large pop-up, so it must not be
 * downloaded or drawn until a book has been opened, but its code is fetched quietly beforehand so the
 * first tap does not wait.
 */
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

const probe = vi.hoisted(() => ({
  readerLoads: 0,
  readerProps: null,
  playable: null,
  fetchBook: null,
  preload: null,
  fetchCalls: 0,
  preloadCalls: [],
  fs: { enter: vi.fn(async () => true), exit: vi.fn(async () => {}) },
}));

vi.mock('../../../hooks/courseProgressHook', () => ({
  useCourseProgress: () => ({ getChildBookReadings: vi.fn(async () => ({ success: true, data: [] })) }),
}));
vi.mock('../../../hooks/cmsBookPlayer', () => ({
  default: () => ({
    loadPlayableBookById: (id) => {
      probe.fetchCalls += 1;
      return probe.fetchBook(id);
    },
    preloadBookMedia: (args) => {
      probe.preloadCalls.push(args);
      return probe.preload(args);
    },
    clearPreloadState: () => {},
    preloadProgress: 0,
    preloadSummary: null,
    loading: { preload: false },
  }),
}));
vi.mock('../../../utils/playerFullscreen', () => ({
  enterPlayerFullscreen: (...args) => probe.fs.enter(...args),
  exitPlayerFullscreen: (...args) => probe.fs.exit(...args),
}));
vi.mock('./ChildModuleCards', () => ({
  default: ({ book, onCardClick }) => (
    <button type="button" onClick={onCardClick}>
      {book.title}
    </button>
  ),
}));
vi.mock('../common/html5Player', () => ({ default: () => null }));
vi.mock('../common/cmsCompletionDialog', () => ({ default: () => null }));

// Registered again for every test (see mount): the mock registry remembers a module once it has been
// loaded, and each test needs to see whether *its own* page asked for the reader.
const registerReader = () =>
  vi.doMock('../common/cmsPLayer', () => {
    probe.readerLoads += 1;
    return {
      default: (props) => {
        probe.readerProps = props;
        return props.open ? <div data-testid="reader">reader with {props.pages.length} pages</div> : null;
      },
    };
  });

const book = { _id: 'b1', title: 'Built-in story', packageType: 'builtin', cmsBookId: 'cms1' };

// A fresh copy of the section is imported for every test, which the first time takes a while.
vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });

const mount = async (books = [book]) => {
  vi.resetModules();
  registerReader();
  const { default: ChildModuleLibrary } = await import('./ChildModuleLibrary');
  vi.useFakeTimers(); // only after the import: loading a module needs real time
  return render(
    <Provider store={configureStore({ reducer: { ui: (state = {}) => state } })}>
      <MemoryRouter initialEntries={['/child/kid1/journey/c1']}>
        <Routes>
          <Route path="/child/:id/journey/:courseId" element={<ChildModuleLibrary books={books} />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

const settle = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  probe.readerLoads = 0;
  probe.readerProps = null;
  probe.playable = { pages: [{ type: 'cover' }, { type: 'content' }] };
  probe.fetchCalls = 0;
  probe.preloadCalls = [];
  probe.fs.enter.mockClear();
  probe.fs.exit.mockClear();
  probe.fetchBook = async () => ({ data: probe.playable });
  probe.preload = async () => undefined;
});

afterEach(() => {
  vi.useRealTimers();
  delete navigator.connection;
});

describe('Built-in book reader', () => {
  it('is not drawn before a book is opened', async () => {
    await mount();
    await settle(100);

    expect(probe.readerProps).toBeNull();
    expect(screen.queryByTestId('reader')).not.toBeInTheDocument();
  });

  it('has its code fetched quietly in the background, so the first tap does not wait', async () => {
    await mount();
    expect(probe.readerLoads).toBe(0);

    await settle(1500);

    expect(probe.readerLoads).toBe(1);
    expect(screen.queryByTestId('reader')).not.toBeInTheDocument();
  });

  it('opens with the book\'s pages when a book is tapped', async () => {
    await mount();
    await settle(1500);

    fireEvent.click(screen.getByText('Built-in story'));
    await settle(10);

    expect(screen.getByTestId('reader')).toHaveTextContent('reader with 2 pages');
  });

  it('still opens when the tap comes before the background fetch (the code downloads on demand)', async () => {
    await mount();
    fireEvent.click(screen.getByText('Built-in story'));
    await settle(10);

    expect(screen.getByTestId('reader')).toBeInTheDocument();
  });

  it('keeps the reader drawn (closed) after it was opened, so its closing is handled by the reader', async () => {
    await mount();
    await settle(1500);
    fireEvent.click(screen.getByText('Built-in story'));
    await settle(10);

    await act(async () => probe.readerProps.onClose());

    expect(probe.readerProps.open).toBe(false);
    expect(screen.queryByTestId('reader')).not.toBeInTheDocument();
  });

  it('does not fetch the reader on a save-data connection until a book is opened', async () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    await mount();
    await settle(5000);
    expect(probe.readerLoads).toBe(0);

    fireEvent.click(screen.getByText('Built-in story'));
    await settle(10);
    expect(screen.getByTestId('reader')).toBeInTheDocument();
  });
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('Opening a built-in book', () => {
  const tap = () => fireEvent.click(screen.getByText('Built-in story'));

  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('opens the reader at once, with the getting-ready panel, while the pages of the book are still on the way', async () => {
    const gate = deferred();
    probe.fetchBook = () => gate.promise;
    await mount();
    await settle(1500);

    tap();
    await settle(10);

    expect(probe.readerProps.open).toBe(true);
    expect(probe.readerProps.isFetchingBook).toBe(true);
    expect(probe.readerProps.isPreloading).toBe(true);
    expect(probe.readerProps.pages).toEqual([]);
  });

  it('hands the book over to the reader (which downloads its media itself) and ends the fetching wait when the book arrives', async () => {
    const gate = deferred();
    probe.fetchBook = () => gate.promise;
    await mount();
    await settle(1500);
    tap();
    await settle(10);

    await act(async () => gate.resolve({ data: probe.playable }));

    expect(probe.readerProps.open).toBe(true);
    expect(probe.readerProps.isFetchingBook).toBe(false);
    expect(probe.readerProps.pages).toHaveLength(2);
    // the reader gets the whole book (its media list and version) and downloads from it itself
    expect(probe.readerProps.book).toBe(probe.playable);
    expect(probe.readerProps.autoLoadMedia).toBe(true);
    expect(probe.readerProps.isPreloading).toBe(false); // the reader adds its own wait for page 1
    // the old whole-book preload is not run for children any more
    expect(probe.preloadCalls).toHaveLength(0);
  });

  it('ignores a second tap while the book is on the way, so it is fetched only once', async () => {
    probe.fetchBook = () => deferred().promise;
    await mount();
    await settle(1500);

    tap();
    tap();
    tap();
    await settle(10);

    expect(probe.fetchCalls).toBe(1);
  });

  it('leaves the reader closed when it is closed while the book is on the way, even when the book then arrives', async () => {
    const gate = deferred();
    probe.fetchBook = () => gate.promise;
    await mount();
    await settle(1500);
    tap();
    await settle(10);

    await act(async () => probe.readerProps.onClose());
    expect(probe.readerProps.open).toBe(false);
    await act(async () => gate.resolve({ data: probe.playable }));

    expect(probe.readerProps.open).toBe(false);
    expect(probe.readerProps.pages).toEqual([]);
    expect(probe.readerProps.isFetchingBook).toBe(false);
    expect(probe.readerProps.book).toBeNull();
  });

  it('lets the child try again after closing, and ignores the late answer of the first tap', async () => {
    const first = deferred();
    const second = deferred();
    const answers = [first, second];
    probe.fetchBook = () => answers.shift().promise;
    await mount();
    await settle(1500);
    tap();
    await settle(10);
    await act(async () => probe.readerProps.onClose());

    tap();
    await settle(10);
    expect(probe.fetchCalls).toBe(2);
    expect(probe.readerProps.open).toBe(true);

    await act(async () => first.resolve({ data: { pages: [{ type: 'old' }] } }));
    expect(probe.readerProps.isFetchingBook).toBe(true);
    expect(probe.readerProps.pages).toEqual([]);
    expect(probe.readerProps.book).toBeNull();

    await act(async () => second.resolve({ data: probe.playable }));
    expect(probe.readerProps.pages).toHaveLength(2);
    expect(probe.readerProps.book).toBe(probe.playable);
  });

  it('closes the reader when the book cannot be fetched, and lets the child tap again', async () => {
    probe.fetchBook = vi.fn().mockRejectedValueOnce('Book not found');
    probe.fetchBook.mockImplementation(async () => ({ data: probe.playable }));
    await mount();
    await settle(1500);

    tap();
    await settle(10);

    expect(probe.readerProps.open).toBe(false);
    expect(probe.readerProps.isFetchingBook).toBe(false);
    expect(probe.readerProps.isPreloading).toBe(false);

    tap();
    await settle(10);
    expect(probe.fetchCalls).toBe(2);
    expect(probe.readerProps.open).toBe(true);
    expect(probe.readerProps.pages).toHaveLength(2);
  });

  it('closing the reader lets go of the book, so its downloaded media can be freed', async () => {
    await mount();
    await settle(1500);

    tap();
    await settle(10);

    expect(probe.readerProps.book).toBe(probe.playable);

    await act(async () => probe.readerProps.onClose());
    expect(probe.readerProps.open).toBe(false);
    expect(probe.readerProps.book).toBeNull();
    expect(probe.readerProps.pages).toEqual([]);
  });

  it('opens the reader for a book with no pages without starting a preload', async () => {
    probe.playable = { pages: [] };
    await mount();
    await settle(1500);

    tap();
    await settle(10);

    expect(probe.readerProps.open).toBe(true);
    expect(probe.readerProps.pages).toEqual([]);
    expect(probe.readerProps.isFetchingBook).toBe(false);
    expect(probe.preloadCalls).toHaveLength(0);
  });

  it('does not fetch or open anything for a book that is not a built-in one', async () => {
    await mount([{ _id: 'h1', title: 'Web book', packageType: 'html5', html5PackageId: 'pkg1' }]);
    await settle(1500);

    fireEvent.click(screen.getByText('Web book'));
    await settle(10);

    expect(probe.fetchCalls).toBe(0);
    expect(probe.readerProps?.open ?? false).toBe(false);
  });
});

describe('Full screen for a built-in book (phones that can)', () => {
  const tap = () => fireEvent.click(screen.getByText('Built-in story'));

  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('is not asked for before a book is tapped', async () => {
    await mount();
    await settle(1500);

    expect(probe.fs.enter).not.toHaveBeenCalled();
  });

  it('is asked for inside the tap, before the pages of the book have arrived (a browser only grants it in a tap)', async () => {
    probe.fetchBook = () => deferred().promise;
    await mount();
    await settle(1500);

    tap();

    expect(probe.fs.enter).toHaveBeenCalledTimes(1);
    expect(probe.fetchCalls).toBe(1);
  });

  it('is asked for once even when the card is tapped again while the book is on the way', async () => {
    probe.fetchBook = () => deferred().promise;
    await mount();
    await settle(1500);

    tap();
    tap();

    expect(probe.fs.enter).toHaveBeenCalledTimes(1);
  });

  it('is given back when the reader is closed', async () => {
    await mount();
    await settle(1500);
    tap();
    await settle(10);
    expect(probe.fs.exit).not.toHaveBeenCalled();

    await act(async () => probe.readerProps.onClose());

    expect(probe.fs.exit).toHaveBeenCalledTimes(1);
  });

  it('is given back when the book cannot be fetched', async () => {
    probe.fetchBook = async () => {
      throw new Error('no book');
    };
    await mount();
    await settle(1500);

    tap();
    await settle(10);

    expect(probe.fs.enter).toHaveBeenCalledTimes(1);
    expect(probe.fs.exit).toHaveBeenCalledTimes(1);
  });

  it('is given back when the page is left with the book open', async () => {
    await mount();
    await settle(1500);
    tap();
    await settle(10);
    probe.fs.exit.mockClear();

    cleanup();

    expect(probe.fs.exit).toHaveBeenCalledTimes(1);
  });

  it('is not asked for by a book that is not a built-in one', async () => {
    await mount([{ _id: 'h1', title: 'Web book', packageType: 'html5', html5PackageId: 'pkg1' }]);
    await settle(1500);

    fireEvent.click(screen.getByText('Web book'));
    await settle(10);

    expect(probe.fs.enter).not.toHaveBeenCalled();
  });
});
