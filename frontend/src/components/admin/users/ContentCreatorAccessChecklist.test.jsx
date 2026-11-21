import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentCreatorAccessChecklist from './ContentCreatorAccessChecklist';

const AREAS = [
  { key: 'dashboard', label: 'Dashboard', help: 'The home page', legacy: true },
  { key: 'contents', label: 'Contents', help: 'Lessons and videos', legacy: true },
  { key: 'notifications', label: 'Notifications', help: 'Send push notifications', legacy: false },
];

const box = (name) => screen.getByRole('checkbox', { name });
const ticked = () => screen.getAllByRole('checkbox').filter((item) => item.checked).map((item) => item.getAttribute('aria-label'));

function mount(props = {}) {
  const onChange = vi.fn();
  render(<ContentCreatorAccessChecklist areas={AREAS} value={[]} onChange={onChange} {...props} />);
  return { onChange, click: userEvent.setup() };
}

describe('the checkboxes', () => {
  it('shows one per area, with its help line, ticked as given', () => {
    mount({ value: ['contents'] });

    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(ticked()).toEqual(['Contents']);
    expect(screen.getByText('Send push notifications')).toBeInTheDocument();
  });

  it('is a labelled group', () => {
    mount();

    expect(screen.getByRole('group', { name: 'What this person can use' })).toBeInTheDocument();
  });

  it('ticking one reports the new list, in checkbox order', async () => {
    const { onChange, click } = mount({ value: ['notifications'] });

    await click.click(box('Dashboard'));

    expect(onChange).toHaveBeenCalledWith(['dashboard', 'notifications']);
  });

  it('unticking one reports the list without it', async () => {
    const { onChange, click } = mount({ value: ['dashboard', 'contents'] });

    await click.click(box('Dashboard'));

    expect(onChange).toHaveBeenCalledWith(['contents']);
  });

  it('Select all ticks everything, Clear ticks nothing', async () => {
    const { onChange, click } = mount({ value: ['contents'] });

    await click.click(screen.getByRole('button', { name: 'Select all' }));
    expect(onChange).toHaveBeenLastCalledWith(['dashboard', 'contents', 'notifications']);

    await click.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('does not report anything when no one is listening (no crash)', async () => {
    render(<ContentCreatorAccessChecklist areas={AREAS} value={[]} />);

    await userEvent.setup().click(box('Dashboard'));

    expect(ticked()).toEqual([]);
  });
});

describe('disabled and read only', () => {
  it('disabled: nothing can be changed, including Select all and Clear', () => {
    mount({ value: ['contents'], disabled: true });

    screen.getAllByRole('checkbox').forEach((item) => expect(item).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Select all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });

  it('read only: shows what is ticked, with no buttons and nothing to change', () => {
    mount({ value: ['dashboard', 'notifications'], readOnly: true });

    expect(ticked()).toEqual(['Dashboard', 'Notifications']);
    screen.getAllByRole('checkbox').forEach((item) => expect(item).toBeDisabled());
    expect(screen.queryByRole('button', { name: 'Select all' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });
});

describe('what will change (one person)', () => {
  it('marks a box that was ticked and is not any more as "Will be removed"', () => {
    mount({ original: ['dashboard', 'contents'], value: ['dashboard'] });

    expect(screen.getByText('Will be removed')).toBeInTheDocument();
    expect(screen.queryByText('Will be added')).not.toBeInTheDocument();
  });

  it('marks a box that is newly ticked as "Will be added"', () => {
    mount({ original: ['dashboard'], value: ['dashboard', 'notifications'] });

    expect(screen.getByText('Will be added')).toBeInTheDocument();
  });

  it('marks both when both happen', () => {
    mount({ original: ['contents'], value: ['notifications'] });

    expect(screen.getByText('Will be removed')).toBeInTheDocument();
    expect(screen.getByText('Will be added')).toBeInTheDocument();
  });

  it('marks nothing when nothing changed, and nothing at all without an original', () => {
    const { unmount } = render(<ContentCreatorAccessChecklist areas={AREAS} original={['contents']} value={['contents']} />);
    expect(screen.queryByText(/Will be/)).not.toBeInTheDocument();
    unmount();

    render(<ContentCreatorAccessChecklist areas={AREAS} value={['contents']} />);
    expect(screen.queryByText(/Will be/)).not.toBeInTheDocument();
  });
});

describe('what will change (several people)', () => {
  it('marks by how many would lose or gain it', () => {
    mount({ original: [], value: ['notifications'], addedCounts: { dashboard: 0, contents: 0, notifications: 3 }, removedCounts: { dashboard: 2, contents: 1, notifications: 0 } });

    expect(screen.getAllByText('Will be removed for 2 people')).toHaveLength(1);
    expect(screen.getByText('Will be removed for 1 person')).toBeInTheDocument();
    expect(screen.getByText('Will be added for 3 people')).toBeInTheDocument();
  });

  it('marks nothing for an area nobody gains or loses', () => {
    mount({ original: [], value: ['dashboard'], addedCounts: { dashboard: 0, contents: 0, notifications: 0 }, removedCounts: { dashboard: 0, contents: 0, notifications: 0 } });

    expect(screen.queryByText(/Will be/)).not.toBeInTheDocument();
  });
});

describe('while the options load or fail', () => {
  it('shows that it is loading when there is nothing to show yet', () => {
    render(<ContentCreatorAccessChecklist areas={[]} loading />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading the access options');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows the reason and a Retry when they could not be loaded', async () => {
    const onRetry = vi.fn();
    render(<ContentCreatorAccessChecklist areas={[]} loadError="Could not reach the server. Check your connection and try again." onRetry={onRetry} />);

    expect(screen.getByText(/Could not reach the server/)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows no Retry when nothing can be retried', () => {
    render(<ContentCreatorAccessChecklist areas={[]} loadError="Failed" />);

    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('keeps showing the checkboxes it has while a refresh is under way, or has failed', () => {
    render(<ContentCreatorAccessChecklist areas={AREAS} value={['contents']} loading loadError="Failed" />);

    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });
});
