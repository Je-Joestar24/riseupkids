/**
 * End to end for the Home page: the real page and its three sections (welcome, live class, awards);
 * only the network services are replaced. Covers the requests starting together, each section's
 * placeholder, and the child record being requested once instead of once per section.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import childrenService from '../../services/childrenService';
import meetingService from '../../services/meetingService';
import youtubeService from '../../services/youtubeService';
import ChildHome from './ChildHome';

vi.mock('../../services/childrenService', () => ({ default: { getChildById: vi.fn() } }));
vi.mock('../../services/meetingService', () => ({
  default: { getUpcomingMeetings: vi.fn(), getGuestModeLink: vi.fn() },
}));
vi.mock('../../services/youtubeService', () => ({ default: { getActiveLive: vi.fn() } }));
vi.mock('../../hooks/youtubeHook', () => ({
  default: () => ({ endLive: vi.fn(), actionLoading: false }),
}));

const child = (extra = {}) => ({
  _id: 'kid1',
  displayName: 'Alex',
  stats: { currentStreak: 5, totalStars: 12, totalBadges: 3 },
  ...extra,
});
const meeting = { _id: 'm1', title: 'Story time', startTime: '2026-11-04T10:00:00Z', meetLink: 'https://meet.example/x' };

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

function mount() {
  const store = configureStore({ reducer: { user: (state = {}) => state } });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/child/kid1/home']}>
        <Routes>
          <Route path="/child/:id/home" element={<ChildHome childId="kid1" />} />
          <Route path="/child/:id/explore" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

const flush = () => act(async () => {});
const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));
const liveSkeleton = () => screen.queryByRole('status', { name: 'Loading live class' });

describe('Home page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    childrenService.getChildById.mockResolvedValue({ data: child() });
    meetingService.getUpcomingMeetings.mockResolvedValue({ success: true, data: [] });
    youtubeService.getActiveLive.mockResolvedValue({ success: true, data: null });
  });
  afterEach(() => vi.useRealTimers());

  describe('requests', () => {
    it('asks for the child, the next class and any live stream at the same moment', async () => {
      childrenService.getChildById.mockReturnValue(new Promise(() => {}));
      meetingService.getUpcomingMeetings.mockReturnValue(new Promise(() => {}));
      youtubeService.getActiveLive.mockReturnValue(new Promise(() => {}));

      mount();
      await flush();

      expect(childrenService.getChildById).toHaveBeenCalledTimes(1);
      expect(meetingService.getUpcomingMeetings).toHaveBeenCalledTimes(1);
      expect(youtubeService.getActiveLive).toHaveBeenCalledTimes(1);
    });

    it('requests the child record once, not once per section', async () => {
      mount();
      await flush();

      expect(childrenService.getChildById).toHaveBeenCalledTimes(1);
    });
  });

  describe('first load', () => {
    it('shows the name and counts with no placeholder when the answer is quick', async () => {
      mount();
      await flush();

      expect(screen.getByText('Hi, Alex!')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(document.querySelector('.MuiSkeleton-root')).toBeNull();
    });

    it('shows the page at once and holds the name and counts with placeholders while the child loads', async () => {
      const pending = deferred();
      childrenService.getChildById.mockReturnValue(pending.promise);

      mount();
      // The page is there straight away: no full-screen spinner, button already usable.
      expect(screen.getByRole('button', { name: /Start Learning/ })).toBeInTheDocument();
      expect(screen.getByText('Ready to learn something awesome?')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).toBeNull();

      await tick(200);
      expect(document.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThanOrEqual(4);
      expect(screen.queryByText(/^Hi,/)).toBeNull();

      pending.resolve({ data: child() });
      await flush();

      expect(screen.getByText('Hi, Alex!')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(document.querySelector('.MuiSkeleton-root')).toBeNull();
    });

    it('Start Learning works while the child is still loading', async () => {
      childrenService.getChildById.mockReturnValue(new Promise(() => {}));
      mount();

      await act(async () => screen.getByRole('button', { name: /Start Learning/ }).click());

      expect(screen.getByTestId('where')).toHaveTextContent('/child/kid1/explore');
    });
  });

  describe('live class card', () => {
    it('shows a placeholder card after a short wait, then the class', async () => {
      const pending = deferred();
      meetingService.getUpcomingMeetings.mockReturnValue(pending.promise);

      mount();
      await tick(100);
      expect(liveSkeleton()).toBeNull();
      await tick(100);
      expect(liveSkeleton()).toBeInTheDocument();

      pending.resolve({ success: true, data: [meeting] });
      await flush();

      expect(liveSkeleton()).toBeNull();
      expect(screen.getByText('Next Live Class')).toBeInTheDocument();
    });

    it('leaves no card at all when nothing is scheduled, and never flashes one for a quick answer', async () => {
      mount();
      await flush();

      expect(liveSkeleton()).toBeNull();
      expect(screen.queryByText('Next Live Class')).toBeNull();
    });

    it('the child record loading slowly does not hold back the live class', async () => {
      childrenService.getChildById.mockReturnValue(new Promise(() => {}));
      meetingService.getUpcomingMeetings.mockResolvedValue({ success: true, data: [meeting] });

      mount();
      await flush();

      expect(screen.getByText('Next Live Class')).toBeInTheDocument();
    });
  });

  describe('when the child record cannot be loaded', () => {
    it('keeps the page usable with the friendly defaults and does not ask again from each section', async () => {
      childrenService.getChildById.mockRejectedValue(new Error('Server error'));
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

      mount();
      await flush();

      expect(screen.getByText('Hi, Friend!')).toBeInTheDocument();
      expect(screen.getAllByText('0')).toHaveLength(3);
      expect(screen.getByRole('button', { name: /Start Learning/ })).toBeInTheDocument();
      expect(childrenService.getChildById).toHaveBeenCalledTimes(1);
      logged.mockRestore();
    });
  });

  describe('stats update', () => {
    it('refreshes the child once and updates the counts', async () => {
      mount();
      await flush();
      childrenService.getChildById.mockResolvedValueOnce({
        data: child({ stats: { currentStreak: 6, totalStars: 20, totalBadges: 4 } }),
      });

      await act(async () => {
        window.dispatchEvent(new Event('childStatsUpdated'));
      });

      expect(childrenService.getChildById).toHaveBeenCalledTimes(2);
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('stops listening once the page is closed', async () => {
      const remove = vi.spyOn(window, 'removeEventListener');
      const add = vi.spyOn(window, 'addEventListener');
      const store = configureStore({ reducer: { user: (state = {}) => state } });
      const { unmount } = render(
        <Provider store={store}>
          <MemoryRouter>
            <ChildHome childId="kid1" />
          </MemoryRouter>
        </Provider>
      );
      await flush();

      unmount();

      const type = 'childStatsUpdated';
      expect(remove.mock.calls.filter(([t]) => t === type).length).toBe(
        add.mock.calls.filter(([t]) => t === type).length
      );
      add.mockRestore();
      remove.mockRestore();
    });
  });
});
