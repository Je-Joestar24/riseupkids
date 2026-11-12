/**
 * The smaller pieces of the Experiences page on their own: the pagination bar, the filters (including what
 * happens to the search box when the filters are cleared from outside), and a card.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../config/theme';
import ExperienceCard from './ExperienceCard';
import ExperiencesList from './ExperiencesList';
import ExperiencesFilters, { SEARCH_DEBOUNCE_MS } from './ExperiencesFilters';
import ExperiencesHeader from './ExperiencesHeader';
import ExperiencesPagination from './ExperiencesPagination';

const wrap = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ExperiencesPagination', () => {
  it('shows nothing when there is no paging or no rows', () => {
    const { container } = wrap(<ExperiencesPagination pagination={null} />);
    expect(container).toBeEmptyDOMElement();
    cleanup();
    const empty = wrap(<ExperiencesPagination pagination={{ page: 1, limit: 12, total: 0, pages: 1 }} />);
    expect(empty.container).toBeEmptyDOMElement();
  });

  it('shows the range, with the singular for one experience', () => {
    wrap(<ExperiencesPagination pagination={{ page: 1, limit: 12, total: 1, pages: 1 }} onPageChange={() => {}} onLimitChange={() => {}} />);
    expect(screen.getByText('Showing 1 to 1 of 1 experience')).toBeInTheDocument();
  });

  it('tells the page and the size it is given', async () => {
    const onPageChange = vi.fn();
    const onLimitChange = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperiencesPagination pagination={{ page: 2, limit: 12, total: 30, pages: 3 }} onPageChange={onPageChange} onLimitChange={onLimitChange} />);

    await user.click(screen.getByRole('button', { name: 'Go to page 3' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '48' }));
    expect(onLimitChange).toHaveBeenCalledWith(48);
  });

  it('shows a size that is not in the list (an old bookmark) instead of an empty box', () => {
    wrap(<ExperiencesPagination pagination={{ page: 1, limit: 30, total: 40, pages: 2 }} onPageChange={() => {}} onLimitChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('30');
  });

  it('never selects a page past the last one', () => {
    wrap(<ExperiencesPagination pagination={{ page: 9, limit: 12, total: 30, pages: 3 }} onPageChange={() => {}} onLimitChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'page 3' })).toHaveAttribute('aria-current', 'true');
  });
});

describe('ExperiencesFilters', () => {
  const counts = { all: 5, published: 2, draft: 3 };

  it('puts the counts on the tabs, and treats missing counts as zero', () => {
    wrap(<ExperiencesFilters counts={counts} onSearchChange={() => {}} onStatusChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'All (5)' })).toBeInTheDocument();
    cleanup();
    wrap(<ExperiencesFilters counts={undefined} onSearchChange={() => {}} onStatusChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'All (0)' })).toBeInTheDocument();
  });

  it('marks the current status and tells the one that is picked', async () => {
    const onStatusChange = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperiencesFilters status="draft" counts={counts} onSearchChange={() => {}} onStatusChange={onStatusChange} />);
    expect(screen.getByRole('tab', { name: 'Drafts (3)' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('tab', { name: 'Published (2)' }));
    expect(onStatusChange).toHaveBeenCalledWith('published');
  });

  it('sends the search once, trimmed, after the pause (and the pause is 300 ms)', async () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(300);
    vi.useFakeTimers();
    const onSearchChange = vi.fn();
    wrap(<ExperiencesFilters counts={counts} onSearchChange={onSearchChange} onStatusChange={() => {}} />);
    const box = screen.getByLabelText('Search experiences');
    fireEvent.change(box, { target: { value: ' s' } });
    await act(async () => vi.advanceTimersByTime(200));
    fireEvent.change(box, { target: { value: ' straw ' } });
    await act(async () => vi.advanceTimersByTime(299));
    expect(onSearchChange).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(2));
    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('straw');
  });

  it('does not send the same search again', async () => {
    vi.useFakeTimers();
    const onSearchChange = vi.fn();
    wrap(<ExperiencesFilters search="straw" counts={counts} onSearchChange={onSearchChange} onStatusChange={() => {}} />);
    await act(async () => vi.advanceTimersByTime(1000));
    expect(onSearchChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Search experiences'), { target: { value: 'straw  ' } }); // only spaces added
    await act(async () => vi.advanceTimersByTime(1000));
    expect(onSearchChange).not.toHaveBeenCalled();
  });

  it('starts with the search it is given, and shows a search that is changed from outside (filters cleared)', () => {
    const { rerender } = wrap(<ExperiencesFilters search="banana" counts={counts} onSearchChange={() => {}} onStatusChange={() => {}} />);
    expect(screen.getByLabelText('Search experiences')).toHaveValue('banana');
    rerender(
      <ThemeProvider theme={theme}>
        <ExperiencesFilters search="" counts={counts} onSearchChange={() => {}} onStatusChange={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByLabelText('Search experiences')).toHaveValue('');
  });

  it('keeps the spaces the admin is typing (a space between two words is not stripped as the search comes back)', () => {
    const { rerender } = wrap(<ExperiencesFilters search="" counts={counts} onSearchChange={() => {}} onStatusChange={() => {}} />);
    const box = screen.getByLabelText('Search experiences');
    fireEvent.change(box, { target: { value: 'straw ' } });
    rerender(
      <ThemeProvider theme={theme}>
        <ExperiencesFilters search="straw" counts={counts} onSearchChange={() => {}} onStatusChange={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByLabelText('Search experiences')).toHaveValue('straw ');
  });
});

describe('ExperiencesHeader', () => {
  it('shows the total only once it is known, with singular and plural', () => {
    wrap(<ExperiencesHeader total={0} loaded={false} />);
    expect(screen.queryByText(/Total:/)).not.toBeInTheDocument();
    cleanup();
    wrap(<ExperiencesHeader total={1} loaded />);
    expect(screen.getByText('Total: 1 experience')).toBeInTheDocument();
    cleanup();
    wrap(<ExperiencesHeader total={7} loaded />);
    expect(screen.getByText('Total: 7 experiences')).toBeInTheDocument();
  });

  it('tells when Add experience is pressed', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperiencesHeader total={0} loaded onAdd={onAdd} />);
    await user.click(screen.getByRole('button', { name: 'Add experience' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('explains that only published experiences are visible to children', () => {
    wrap(<ExperiencesHeader total={0} loaded />);
    expect(screen.getByText(/Only published experiences are visible to children/)).toBeInTheDocument();
  });
});

describe('ExperienceCard', () => {
  const experience = {
    uuid: 'u-1',
    title: 'Smoothie',
    description: 'Make one',
    coverImage: null,
    videoCount: 2,
    order: 4,
    isPublished: false,
    updatedAt: '2026-11-10T10:00:00.000Z',
  };

  it('tells what to do with it: the switch and Delete give back the experience', async () => {
    const onTogglePublished = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperienceCard experience={experience} onTogglePublished={onTogglePublished} onDelete={onDelete} />);

    await user.click(screen.getByRole('checkbox', { name: 'Publish Smoothie' }));
    expect(onTogglePublished).toHaveBeenCalledWith(experience, true);
    await user.click(screen.getByRole('button', { name: 'Delete Smoothie' }));
    expect(onDelete).toHaveBeenCalledWith(experience);
  });

  it('Edit gives back the experience, and is blocked while the card is busy', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperienceCard experience={experience} onTogglePublished={() => {}} onEdit={onEdit} onDelete={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Edit Smoothie' }));
    expect(onEdit).toHaveBeenCalledWith(experience);
    cleanup();
    wrap(<ExperienceCard experience={experience} busy="deleting" onTogglePublished={() => {}} onEdit={onEdit} onDelete={() => {}} />);
    expect(screen.getByRole('button', { name: 'Edit Smoothie' })).toBeDisabled();
  });

  it('a published one offers to unpublish', async () => {
    const onTogglePublished = vi.fn();
    const user = userEvent.setup();
    wrap(<ExperienceCard experience={{ ...experience, isPublished: true }} onTogglePublished={onTogglePublished} onDelete={() => {}} />);
    await user.click(screen.getByRole('checkbox', { name: 'Unpublish Smoothie' }));
    expect(onTogglePublished).toHaveBeenCalledWith({ ...experience, isPublished: true }, false);
  });

  it('every action is blocked while it is busy, whichever kind of work it is', () => {
    for (const busy of ['publishing', 'unpublishing', 'deleting']) {
      wrap(<ExperienceCard experience={experience} busy={busy} onTogglePublished={() => {}} onDelete={() => {}} />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Delete Smoothie' })).toBeDisabled();
      cleanup();
    }
  });

  it('says what it is doing', () => {
    wrap(<ExperienceCard experience={experience} busy="unpublishing" onTogglePublished={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Hiding…')).toBeInTheDocument();
  });

  it('shows no position badge when it has none, and no date when it has none', () => {
    wrap(<ExperienceCard experience={{ ...experience, order: 0, updatedAt: undefined }} onTogglePublished={() => {}} onDelete={() => {}} />);
    expect(screen.queryByText(/^#/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Updated/)).not.toBeInTheDocument();
  });

  it('a new cover address gets another chance after a broken one', () => {
    const { rerender } = wrap(<ExperienceCard experience={{ ...experience, coverImage: 'https://x/broken.png' }} onTogglePublished={() => {}} onDelete={() => {}} />);
    fireEvent.error(screen.getByRole('img', { name: 'Smoothie cover' }));
    expect(screen.getByText('No cover picture')).toBeInTheDocument();
    rerender(
      <ThemeProvider theme={theme}>
        <ExperienceCard experience={{ ...experience, coverImage: 'https://x/fixed.png' }} onTogglePublished={() => {}} onDelete={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getByRole('img', { name: 'Smoothie cover' })).toHaveAttribute('src', 'https://x/fixed.png');
  });
});

describe('ExperiencesList empty messages', () => {
  const props = { items: [], loaded: true, onRetry: () => {}, onClearFilters: () => {}, onTogglePublished: () => {}, onDelete: () => {} };

  it('says "No experiences match" (with Clear filters) only when some exist but the filters hide them all', () => {
    wrap(<ExperiencesList {...props} hasFilters totalExperiences={4} />);
    expect(screen.getByText('No experiences match')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('says "No experiences yet" when none exist at all, even if a search is typed', () => {
    wrap(<ExperiencesList {...props} hasFilters totalExperiences={0} />);
    expect(screen.getByText('No experiences yet')).toBeInTheDocument();
    expect(screen.queryByText('No experiences match')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('says "No experiences yet" when none exist and no filter is on', () => {
    wrap(<ExperiencesList {...props} hasFilters={false} totalExperiences={0} />);
    expect(screen.getByText('No experiences yet')).toBeInTheDocument();
  });
});
