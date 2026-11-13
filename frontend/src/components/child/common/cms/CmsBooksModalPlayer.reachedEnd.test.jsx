/**
 * A book only counts as read when the child got to its LAST page: the reader says so with `reachedEnd`
 * when it is closed.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../../config/theme';
import CmsBooksModalPlayer from './CmsBooksModalPlayer';

// Pages that only offer a Next button, so the test can walk through the book
vi.mock('../../../admin/common/cmsTest/ContentTest', () => ({
  default: ({ page, hasNext, onNext }) => (
    <div>
      <p>{`page ${page.id}`}</p>
      {hasNext && <button onClick={onNext}>go next</button>}
    </div>
  ),
}));

const pages = [
  { type: 'content', id: 'a' },
  { type: 'content', id: 'b' },
  { type: 'content', id: 'c' },
];

const open = (bookPages = pages) => {
  const onSessionComplete = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <CmsBooksModalPlayer open onClose={() => {}} pages={bookPages} onSessionComplete={onSessionComplete} />
    </ThemeProvider>
  );
  return onSessionComplete;
};

const close = async (onSessionComplete) => {
  fireEvent.click(screen.getByRole('button', { name: 'Close book player' }));
  await vi.waitFor(() => expect(onSessionComplete).toHaveBeenCalled());
  return onSessionComplete.mock.calls[0][0];
};

describe('the book reader says whether the last page was reached', () => {
  it('closed on the first page: not reached', async () => {
    const session = await close(open());
    expect(session.reachedEnd).toBe(false);
  });

  it('closed in the middle: not reached', async () => {
    const onSessionComplete = open();
    fireEvent.click(screen.getByText('go next'));
    expect((await close(onSessionComplete)).reachedEnd).toBe(false);
  });

  it('closed on the last page: reached', async () => {
    const onSessionComplete = open();
    fireEvent.click(screen.getByText('go next'));
    fireEvent.click(await screen.findByText('go next'));
    await screen.findByText('page c');
    expect((await close(onSessionComplete)).reachedEnd).toBe(true);
  });

  it('a one-page book is read by opening it', async () => {
    expect((await close(open([{ type: 'content', id: 'only' }]))).reachedEnd).toBe(true);
  });
});
