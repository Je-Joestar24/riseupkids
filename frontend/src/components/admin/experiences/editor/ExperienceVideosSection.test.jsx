/**
 * The list of videos on its own: where a drag ended, what shows for an empty and a full list, and that typing in
 * one video does not redraw the others (the list can hold 20 rows, each with two text boxes).
 */
import React, { useCallback, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';

vi.mock('@dnd-kit/sortable', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, useSortable: vi.fn(original.useSortable) };
});

import { useSortable } from '@dnd-kit/sortable';
import theme from '../../../../config/theme';
import ExperienceVideosSection, { moveForDrag } from './ExperienceVideosSection';

const LINK = (n) => `https://iframe.mediadelivery.net/embed/1/v${n}`;
const rows = (count) => Array.from({ length: count }, (_, i) => ({ key: `k${i + 1}`, id: null, title: `Title ${i + 1}`, embedUrl: LINK(i + 1) }));

afterEach(cleanup);

describe('moveForDrag', () => {
  const videos = rows(4);

  it('says where a video went: from its place to the place of the one it was dropped on', () => {
    expect(moveForDrag(videos, { active: { id: 'k1' }, over: { id: 'k3' } })).toEqual({ from: 0, to: 2 });
    expect(moveForDrag(videos, { active: { id: 'k4' }, over: { id: 'k2' } })).toEqual({ from: 3, to: 1 });
  });

  it.each([
    ['dropped on itself', { active: { id: 'k2' }, over: { id: 'k2' } }],
    ['dropped outside the list', { active: { id: 'k2' }, over: null }],
    ['no target at all', { active: { id: 'k2' } }],
    ['no video picked up', { over: { id: 'k2' } }],
    ['a video that is not there', { active: { id: 'gone' }, over: { id: 'k2' } }],
    ['a target that is not there', { active: { id: 'k2' }, over: { id: 'gone' } }],
    ['nothing', undefined],
  ])('is not a move when %s', (_, event) => {
    expect(moveForDrag(videos, event)).toBeNull();
  });
});

const wrap = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
const noop = () => {};
const props = { onAdd: noop, onChange: noop, onRemove: noop, onMove: noop, onPreview: noop };

describe('the list', () => {
  it('an empty list says so, and what to do', () => {
    wrap(<ExperienceVideosSection videos={[]} {...props} />);
    expect(screen.getByText('No videos yet')).toBeInTheDocument();
    expect(screen.getByText('Add at least one video before the experience can be published.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('0 of 20')).toBeInTheDocument();
  });

  it('shows the problem with the list under it', () => {
    wrap(<ExperienceVideosSection videos={[]} error="Add at least one video before publishing." {...props} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one video before publishing.');
  });

  it('numbers the rows in order, and shows each row its own problems', () => {
    wrap(
      <ExperienceVideosSection
        videos={rows(3)}
        rowErrors={{ k2: { title: 'Video title is required.', embedUrl: 'Video link is required.' } }}
        {...props}
      />
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect([1, 2, 3].map((n) => screen.getByLabelText(`Position ${n}`).textContent)).toEqual(['1', '2', '3']);
    expect(screen.getByLabelText('Video 2 title')).toBeInvalid();
    expect(screen.getByLabelText('Video 1 title')).toBeValid();
    expect(screen.getByText('Video link is required.')).toBeInTheDocument();
  });

  it('tells which row to add, change, remove, move and preview', async () => {
    const calls = { onAdd: vi.fn(), onChange: vi.fn(), onRemove: vi.fn(), onMove: vi.fn(), onPreview: vi.fn() };
    const user = userEvent.setup();
    wrap(<ExperienceVideosSection videos={rows(3)} {...calls} />);

    await user.click(screen.getByRole('button', { name: 'Add video' }));
    expect(calls.onAdd).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('Video 2 title'), { target: { value: 'New' } });
    expect(calls.onChange).toHaveBeenCalledWith('k2', { title: 'New' });
    fireEvent.change(screen.getByLabelText('Video 3 Bunny link'), { target: { value: 'x' } });
    expect(calls.onChange).toHaveBeenCalledWith('k3', { embedUrl: 'x' });
    await user.click(screen.getByRole('button', { name: 'Remove video 2' }));
    expect(calls.onRemove).toHaveBeenCalledWith('k2');
    await user.click(screen.getByRole('button', { name: 'Move video 2 down' }));
    expect(calls.onMove).toHaveBeenCalledWith(1, 2);
    await user.click(screen.getByRole('button', { name: 'Move video 2 up' }));
    expect(calls.onMove).toHaveBeenCalledWith(1, 0);
    await user.click(screen.getByRole('button', { name: 'Preview video 3' }));
    expect(calls.onPreview).toHaveBeenCalledWith({ title: 'Title 3', url: LINK(3) });
  });

  it('a video with no title is previewed under its number', async () => {
    const onPreview = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperienceVideosSection videos={[{ key: 'a', id: null, title: '   ', embedUrl: LINK(1) }]} {...props} onPreview={onPreview} />);
    await user.click(screen.getByRole('button', { name: 'Preview video 1' }));
    expect(onPreview).toHaveBeenCalledWith({ title: 'Video 1', url: LINK(1) });
  });

  it('at 20 videos Add is blocked and says why; at 19 it is not', () => {
    wrap(<ExperienceVideosSection videos={rows(19)} {...props} />);
    expect(screen.getByRole('button', { name: 'Add video' })).toBeEnabled();
    expect(screen.queryByText('You have reached the limit of 20 videos.')).not.toBeInTheDocument();
    cleanup();
    wrap(<ExperienceVideosSection videos={rows(20)} {...props} />);
    expect(screen.getByRole('button', { name: 'Add video' })).toBeDisabled();
    expect(screen.getByText('You have reached the limit of 20 videos.')).toBeInTheDocument();
  });

  it('puts the cursor in the title of the row that was just added', () => {
    wrap(<ExperienceVideosSection videos={rows(2)} focusKey="k2" {...props} />);
    expect(screen.getByLabelText('Video 2 title')).toHaveFocus();
  });

  it('the first row cannot go up, the last cannot go down', () => {
    wrap(<ExperienceVideosSection videos={rows(3)} {...props} />);
    expect(screen.getByRole('button', { name: 'Move video 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move video 3 down' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move video 2 up' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Move video 2 down' })).toBeEnabled();
  });

  it('a single video can neither go up nor down', () => {
    wrap(<ExperienceVideosSection videos={rows(1)} {...props} />);
    expect(screen.getByRole('button', { name: 'Move video 1 up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move video 1 down' })).toBeDisabled();
  });
});

describe('keeping the list light', () => {
  /** A list the way the page keeps it: typing in a row changes that row only. */
  const Harness = ({ count }) => {
    const [videos, setVideos] = useState(rows(count));
    // Stable, like the page's own handlers: a new function on every draw would redraw every row.
    const onChange = useCallback((key, patch) => setVideos((list) => list.map((video) => (video.key === key ? { ...video, ...patch } : video))), []);
    return <ExperienceVideosSection videos={videos} {...props} onChange={onChange} />;
  };

  /** How many times each row was drawn since the last reset. */
  const drawn = () => {
    const counts = {};
    useSortable.mock.calls.forEach(([{ id }]) => {
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  };

  beforeEach(() => {
    useSortable.mockClear();
  });

  it('typing in one video draws that video and no other', () => {
    wrap(<Harness count={6} />);
    useSortable.mockClear();
    fireEvent.change(screen.getByLabelText('Video 3 title'), { target: { value: 'Changed' } });
    const counts = drawn();
    expect(counts.k3).toBeGreaterThan(0);
    ['k1', 'k2', 'k4', 'k5', 'k6'].forEach((key) => expect(counts[key]).toBeUndefined());
    expect(screen.getByLabelText('Video 3 title')).toHaveValue('Changed');
  });

  it('typing in a link does the same', () => {
    wrap(<Harness count={4} />);
    useSortable.mockClear();
    fireEvent.change(screen.getByLabelText('Video 2 Bunny link'), { target: { value: LINK(99) } });
    const counts = drawn();
    expect(counts.k2).toBeGreaterThan(0);
    ['k1', 'k3', 'k4'].forEach((key) => expect(counts[key]).toBeUndefined());
  });
});
