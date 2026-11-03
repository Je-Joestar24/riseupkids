import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Bone, InlineBone, SkeletonFrame, SKELETON_DELAY_MS } from './ChildSkeleton';
import ChildJourneyCardsSkeleton from '../journey/ChildJourneyCardsSkeleton';
import ChildModuleSkeleton from '../module/ChildModuleSkeleton';
import ChildLoadError from './ChildLoadError';

describe('SkeletonFrame', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows nothing at first, so a quick load never flashes a skeleton', () => {
    render(<SkeletonFrame label="Loading">content</SkeletonFrame>);

    expect(screen.queryByRole('status')).toBeNull();
    act(() => vi.advanceTimersByTime(SKELETON_DELAY_MS - 1));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('appears after the delay, labelled for screen readers', () => {
    render(<SkeletonFrame label="Loading your journey">content</SkeletonFrame>);

    act(() => vi.advanceTimersByTime(SKELETON_DELAY_MS));

    const status = screen.getByRole('status', { name: 'Loading your journey' });
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('content');
  });

  it('shows at once when the delay is 0', () => {
    render(<SkeletonFrame label="Loading" delayMs={0}>content</SkeletonFrame>);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('leaves no timer behind when it goes away before the delay', () => {
    const { unmount } = render(<SkeletonFrame label="Loading">content</SkeletonFrame>);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Bone', () => {
  it('turns the pulse off when the device asks for reduced motion', () => {
    const { container } = render(<Bone data-testid="bone" />);

    const bone = container.querySelector('.MuiSkeleton-root');
    expect(bone).toBeInTheDocument();
    expect(bone.className).toContain('MuiSkeleton-pulse');
    const css = Array.from(document.querySelectorAll('style'))
      .map((style) => style.textContent)
      .join('');
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});

describe('InlineBone', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('holds the line open with a blank first, so the card keeps its height', () => {
    const { container } = render(<p>Hi, <InlineBone width="100px" /></p>);

    expect(container.querySelector('.MuiSkeleton-root')).toBeNull();
    expect(container.textContent).toContain('\u00A0');
  });

  it('turns into a bone after the delay, hidden from screen readers', () => {
    const { container } = render(<p>Hi, <InlineBone width="100px" /></p>);

    act(() => vi.advanceTimersByTime(SKELETON_DELAY_MS));

    const bone = container.querySelector('.MuiSkeleton-root');
    expect(bone).toBeInTheDocument();
    expect(bone.tagName).toBe('SPAN');
    expect(bone).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('page skeletons', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('My Journey: six cover cards only — the title, step and summary stay on the page', () => {
    const { container } = render(<ChildJourneyCardsSkeleton />);
    act(() => vi.advanceTimersByTime(SKELETON_DELAY_MS));

    expect(screen.getByRole('status', { name: 'Loading your journey' })).toBeInTheDocument();
    // 6 cards x (cover + 2 text lines)
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(6 * 3);
  });

  it('course page: a square cover, a progress card and two rows of three cards', () => {
    const { container } = render(<ChildModuleSkeleton />);
    act(() => vi.advanceTimersByTime(SKELETON_DELAY_MS));

    expect(screen.getByRole('status', { name: 'Loading the course' })).toBeInTheDocument();
    // cover + 3 progress lines + 2 x (title + 3 cards)
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(1 + 3 + 2 * 4);
  });
});

describe('ChildLoadError', () => {
  it('shows the message and a Try again button that retries', () => {
    const onRetry = vi.fn();
    render(<ChildLoadError message="Network down" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Network down');
    act(() => screen.getByRole('button', { name: 'Try again' }).click());
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has no button when there is nothing to retry', () => {
    render(<ChildLoadError message="Locked" />);

    expect(screen.queryByRole('button')).toBeNull();
  });
});
