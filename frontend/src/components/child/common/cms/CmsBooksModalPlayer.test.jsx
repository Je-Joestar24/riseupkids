/**
 * The book reader's two waiting states: fetching the book's pages (nothing to measure yet) and loading
 * its media (a percentage). The page components are stood in for; the real wait panel is used.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../config/theme';
import { installMatchMedia, SCREENS } from '../../../../test/matchMediaStub';
import CmsBooksModalPlayer from './CmsBooksModalPlayer';

vi.mock('../../../admin/common/cmsTest/IntroTests', () => ({ default: () => <p>intro page</p> }));
// A page with a little state of its own (a tap counter), to see whether it survives a rotation
vi.mock('../../../admin/common/cmsTest/ContentTest', async () => {
  const { useState } = await import('react');
  return {
    default: () => {
      const [taps, setTaps] = useState(0);
      return <p onClick={() => setTaps(taps + 1)}>{taps ? `content page (${taps})` : 'content page'}</p>;
    },
  };
});
vi.mock('../../../admin/common/cmsTest/DemoTest', () => ({ default: () => <p>demo page</p> }));
vi.mock('../../../admin/common/cmsTest/InteractiveTest', () => ({ default: () => <p>interactive page</p> }));
vi.mock('../../../admin/common/cmsTest/RewardTest', () => ({ default: () => <p>reward page</p> }));

const show = (props) =>
  render(
    <ThemeProvider theme={theme}>
      <CmsBooksModalPlayer open onClose={() => {}} {...props} />
    </ThemeProvider>
  );

const pages = [{ type: 'content', id: 'p1' }];

describe('Book reader waiting states', () => {
  it('while the book\'s pages are being fetched: "Opening your book", a moving bar, no percentage, no empty-book message', () => {
    show({ pages: [], isPreloading: true, isFetchingBook: true });

    expect(screen.getByText('Opening your book...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Opening the book' })).toBeInTheDocument();
    expect(screen.queryByText(/% loaded/)).toBeNull();
    expect(screen.queryByText('No pages to play yet.')).toBeNull();
  });

  it('while the media loads: the usual panel with the percentage', () => {
    show({ pages, isPreloading: true, preloadProgress: 35 });

    expect(screen.getByText('Loading all content...')).toBeInTheDocument();
    expect(screen.getByText('35% loaded')).toBeInTheDocument();
    expect(screen.queryByText('Opening your book...')).toBeNull();
    expect(screen.queryByText('content page')).toBeNull();
  });

  it('shows the first page once nothing is being waited for', () => {
    show({ pages, isPreloading: false });

    expect(screen.getByText('content page')).toBeInTheDocument();
    expect(screen.queryByText('Opening your book...')).toBeNull();
    expect(screen.queryByText('Loading all content...')).toBeNull();
  });

  it('says there is nothing to play for a book with no pages, once the wait is over', () => {
    show({ pages: [], isPreloading: false });

    expect(screen.getByText('No pages to play yet.')).toBeInTheDocument();
  });

  it('can be closed while the book is still being fetched', () => {
    show({ pages: [], isPreloading: true, isFetchingBook: true });

    expect(screen.getByRole('button', { name: 'Close book player' })).toBeEnabled();
  });
});

describe('Book reader on a phone held upright', () => {
  let screenStub;
  afterEach(() => screenStub?.restore());

  const turnCard = () => screen.queryByText('Turn your phone sideways');

  it('asks the child to turn the phone, over the book, with Close still usable', () => {
    screenStub = installMatchMedia(SCREENS.phoneUpright);
    show({ pages, isPreloading: false });

    expect(turnCard()).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Turn your phone sideways');
    expect(screen.getByRole('button', { name: 'Close book player' })).toBeEnabled();
    // the book itself is still there underneath
    expect(screen.getByText('content page')).toBeInTheDocument();
  });

  it.each([
    ['a computer', SCREENS.desktop],
    ['a computer window dragged narrow and tall', { width: 400, height: 800, touch: false }],
    ['a tablet held upright', SCREENS.tablet],
    ['a phone held sideways', SCREENS.phoneSideways],
  ])('shows no card on %s', (_name, size) => {
    screenStub = installMatchMedia(size);
    show({ pages, isPreloading: false });

    expect(turnCard()).toBeNull();
    expect(screen.getByText('content page')).toBeInTheDocument();
  });

  it('also covers the loading panel, which keeps loading underneath', () => {
    screenStub = installMatchMedia(SCREENS.phoneUpright);
    show({ pages: [], isPreloading: true, isFetchingBook: true });

    expect(turnCard()).toBeInTheDocument();
    expect(screen.getByText('Opening your book...')).toBeInTheDocument();
  });

  it('goes away when the phone is turned, and comes back when it is turned upright again', async () => {
    screenStub = installMatchMedia(SCREENS.phoneUpright);
    show({ pages, isPreloading: false });
    expect(turnCard()).toBeInTheDocument();

    await act(async () => screenStub.set(SCREENS.phoneSideways));
    expect(turnCard()).toBeNull();

    await act(async () => screenStub.set(SCREENS.phoneUpright));
    expect(turnCard()).toBeInTheDocument();
  });

  it('keeps the page it was on, with its own state, through a rotation (the book is not rebuilt)', async () => {
    screenStub = installMatchMedia(SCREENS.phoneSideways);
    show({ pages, isPreloading: false });
    fireEvent.click(screen.getByText('content page'));
    const pageAfterTap = screen.getByText('content page (1)');

    await act(async () => screenStub.set(SCREENS.phoneUpright));
    expect(screen.getByText('content page (1)')).toBe(pageAfterTap);

    await act(async () => screenStub.set(SCREENS.phoneSideways));
    expect(screen.getByText('content page (1)')).toBe(pageAfterTap);
  });

  it('can be closed from the card', () => {
    screenStub = installMatchMedia(SCREENS.phoneUpright);
    const onClose = vi.fn();
    show({ pages, isPreloading: false, onClose, onSessionComplete: () => {} });

    fireEvent.click(screen.getByRole('button', { name: 'Close book player' }));

    return vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe('Book reader downloads', () => {
  const book = { id: 'b1', pages: [{ pageId: 'p', type: 'content', audioUrl: 'https://cdn.test/a.mp3' }] };
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchSpy);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('downloads nothing while the reader is closed, even when it is handed a book', () => {
    show({ open: false, book, pages: book.pages, autoLoadMedia: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('downloads the book\'s sound once it is open', async () => {
    show({ open: true, book, pages: book.pages, autoLoadMedia: true });
    await vi.waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('https://cdn.test/a.mp3', expect.objectContaining({ mode: 'cors' })));
  });

  it('downloads nothing when the caller manages the wait itself (no autoLoadMedia)', () => {
    show({ open: true, book, pages: book.pages, isPreloading: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
