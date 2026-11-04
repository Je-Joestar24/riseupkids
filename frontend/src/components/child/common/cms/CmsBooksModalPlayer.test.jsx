/**
 * The book reader's two waiting states: fetching the book's pages (nothing to measure yet) and loading
 * its media (a percentage). The page components are stood in for; the real wait panel is used.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../config/theme';
import CmsBooksModalPlayer from './CmsBooksModalPlayer';

vi.mock('../../../admin/common/cmsTest/IntroTests', () => ({ default: () => <p>intro page</p> }));
vi.mock('../../../admin/common/cmsTest/ContentTest', () => ({ default: () => <p>content page</p> }));
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
