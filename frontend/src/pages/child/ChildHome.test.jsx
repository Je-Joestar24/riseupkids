/**
 * End to end for the Home page: the real page and its three sections (welcome, live class, awards);
 * only the network services are replaced. Covers the requests starting together, each section's
 * placeholder, and the child record being requested once instead of once per section.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import childrenService from '../../services/childrenService';
import meetingService from '../../services/meetingService';
import youtubeService from '../../services/youtubeService';
import courseProgressService from '../../services/courseProgressService';
import childJourneyReducer, { journeyReceived } from '../../store/slices/childJourneySlice';
import childPageCacheReducer from '../../store/slices/childPageCacheSlice';
import ChildHome from './ChildHome';

vi.mock('../../services/childrenService', () => ({ default: { getChildById: vi.fn() } }));
vi.mock('../../services/meetingService', () => ({
  default: { getUpcomingMeetings: vi.fn(), getGuestModeLink: vi.fn() },
}));
vi.mock('../../services/youtubeService', () => ({ default: { getActiveLive: vi.fn() } }));
vi.mock('../../services/courseProgressService', () => ({ default: { getChildCourses: vi.fn() } }));
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

const newStore = () =>
  configureStore({
    reducer: {
      user: (state = {}) => state,
      childJourney: childJourneyReducer,
      childPageCache: childPageCacheReducer,
    },
  });

const treeFor = (childId, store) => (
  <Provider store={store}>
    <MemoryRouter initialEntries={[`/child/${childId}/home`]}>
      <ChildHome childId={childId} />
    </MemoryRouter>
  </Provider>
);

function mount({ childId = 'kid1', store = newStore() } = {}) {
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/child/${childId}/home`]}>
        <Routes>
          <Route path="/child/:id/home" element={<ChildHome childId={childId} />} />
          <Route path="/child/:id/explore" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  return { store, ...view };
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
    courseProgressService.getChildCourses.mockResolvedValue({ success: true, data: [] });
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
      const store = newStore();
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

  describe('starting My Journey ahead of time', () => {
    const getCourses = courseProgressService.getChildCourses;
    const list = [{ course: { _id: 'c1', title: 'First' }, status: 'in_progress' }];

    it('starts the list once Home has its own data, so My Journey opens already filled', async () => {
      getCourses.mockResolvedValue({ success: true, data: list });

      const { store } = mount({ childId: 'homeKidA' });
      await flush();

      expect(getCourses).toHaveBeenCalledTimes(1);
      expect(getCourses).toHaveBeenCalledWith('homeKidA');
      expect(store.getState().childJourney.coursesByChildId.homeKidA).toEqual(list);
    });

    it('waits for the child record first, so Home’s own request is not slowed down', async () => {
      const pending = deferred();
      childrenService.getChildById.mockReturnValue(pending.promise);

      mount({ childId: 'homeKidB' });
      await flush();
      expect(getCourses).not.toHaveBeenCalled();

      pending.resolve({ data: child() });
      await flush();
      expect(getCourses).toHaveBeenCalledTimes(1);
    });

    it('does not ask again when the list is already there', async () => {
      const store = newStore();
      store.dispatch(journeyReceived({ childId: 'homeKidC', courses: list, at: Date.now() }));

      mount({ childId: 'homeKidC', store });
      await flush();

      expect(getCourses).not.toHaveBeenCalled();
    });

    it('asks once, not again when the stats refresh the child', async () => {
      mount({ childId: 'homeKidD' });
      await flush();

      await act(async () => {
        window.dispatchEvent(new Event('childStatsUpdated'));
      });

      expect(getCourses).toHaveBeenCalledTimes(1);
    });

    it('keeps Home working, and shows no popup or error, when the list cannot be loaded', async () => {
      getCourses.mockRejectedValue('Network down');

      mount({ childId: 'homeKidE' });
      await flush();

      expect(screen.getByText('Hi, Alex!')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
    });
  });

  describe('coming back to Home', () => {
    async function firstVisit(childId, store, extra = {}) {
      childrenService.getChildById.mockResolvedValueOnce({ data: child(extra) });
      const view = mount({ childId, store });
      await flush();
      view.unmount();
    }

    it('shows the name and counts at once, with no placeholder, while the refresh is under way', async () => {
      const store = newStore();
      await firstVisit('backKidA', store);
      childrenService.getChildById.mockReturnValue(new Promise(() => {}));

      mount({ childId: 'backKidA', store });
      await tick(500);

      expect(screen.getByText('Hi, Alex!')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(document.querySelector('.MuiSkeleton-root')).toBeNull();
    });

    it('has them from the very first render, before any request has started', async () => {
      const store = newStore();
      await firstVisit('backKidB', store);

      const firstRender = renderToString(treeFor('backKidB', store));

      expect(firstRender).toContain('Hi, Alex!');
    });

    it('replaces the counts when the refresh arrives', async () => {
      const store = newStore();
      await firstVisit('backKidC', store);
      const refresh = deferred();
      childrenService.getChildById.mockReturnValue(refresh.promise);
      mount({ childId: 'backKidC', store });
      await flush();

      refresh.resolve({ data: child({ stats: { currentStreak: 6, totalStars: 20, totalBadges: 4 } }) });
      await flush();

      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.queryByText('12')).toBeNull();
    });

    it('keeps the counts, and shows nothing, when the refresh fails', async () => {
      const store = newStore();
      await firstVisit('backKidD', store);
      childrenService.getChildById.mockRejectedValue(new Error('Server error'));
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

      mount({ childId: 'backKidD', store });
      await flush();

      expect(screen.getByText('Hi, Alex!')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
      logged.mockRestore();
    });

    it('asks again on every visit', async () => {
      const store = newStore();
      await firstVisit('backKidE', store);
      childrenService.getChildById.mockClear();

      mount({ childId: 'backKidE', store });
      await flush();

      expect(childrenService.getChildById).toHaveBeenCalledTimes(1);
    });

    it('never shows another child’s name or counts', async () => {
      const store = newStore();
      await firstVisit('backKidF', store, { displayName: 'Sam' });
      childrenService.getChildById.mockReturnValue(new Promise(() => {}));

      mount({ childId: 'backKidG', store });
      await tick(500);

      expect(screen.queryByText('Hi, Sam!')).toBeNull();
      expect(screen.queryByText('12')).toBeNull();
    });
  });
});
