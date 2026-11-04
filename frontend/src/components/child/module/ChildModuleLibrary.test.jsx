/**
 * The books section of the course page. The built-in book reader is a large pop-up, so it must not be
 * downloaded or drawn until a book has been opened, but its code is fetched quietly beforehand so the
 * first tap does not wait.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

const probe = vi.hoisted(() => ({ readerLoads: 0, readerProps: null, playable: null }));

vi.mock('../../../hooks/courseProgressHook', () => ({
  useCourseProgress: () => ({ getChildBookReadings: vi.fn(async () => ({ success: true, data: [] })) }),
}));
vi.mock('../../../hooks/cmsBookPlayer', () => ({
  default: () => ({
    loadPlayableBookById: async () => ({ data: probe.playable }),
    preloadBookMedia: async () => undefined,
    clearPreloadState: () => {},
    preloadProgress: 0,
    preloadSummary: null,
    loading: { preload: false },
  }),
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

const mount = async () => {
  vi.resetModules();
  registerReader();
  const { default: ChildModuleLibrary } = await import('./ChildModuleLibrary');
  vi.useFakeTimers(); // only after the import: loading a module needs real time
  return render(
    <Provider store={configureStore({ reducer: { ui: (state = {}) => state } })}>
      <MemoryRouter initialEntries={['/child/kid1/journey/c1']}>
        <Routes>
          <Route path="/child/:id/journey/:courseId" element={<ChildModuleLibrary books={[book]} />} />
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
