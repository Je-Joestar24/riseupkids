/**
 * End to end for the Explore page: the real page with its replays row and six collection cards;
 * only the data hooks (network) and the video player are replaced. Covers what stays on screen while
 * loading, cards filling in one by one, the requests starting together, and quiet refreshes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../config/theme';
import { EXPLORE_VIDEO_TYPES, VIDEO_TYPE_LABELS } from '../../constants/exploreVideoTypes';
import childPageCacheReducer from '../../store/slices/childPageCacheSlice';
import ChildExplore from './ChildExplore';

const mockExplore = {
  fetchExploreContent: vi.fn(),
  fetchContentByType: vi.fn(),
  getCoverImageUrl: (path) => path,
  getVideoFileUrl: (path) => path,
};
const mockWatch = {
  getVideoTypeProgress: vi.fn(),
  getTotalStarsForVideoType: vi.fn(),
  getExploreVideoWatchStatus: vi.fn(),
};

vi.mock('../../hooks/exploreHook', () => ({ useExplore: () => mockExplore }));
vi.mock('../../hooks/exploreVideoWatchHook', () => ({ useExploreVideoWatch: () => mockWatch }));
vi.mock('../../components/child/common/VideoPlayerModal', () => ({ default: () => null }));

const TYPES = [
  EXPLORE_VIDEO_TYPES.ARTS_CRAFTS,
  EXPLORE_VIDEO_TYPES.COOKING,
  EXPLORE_VIDEO_TYPES.MUSIC,
  EXPLORE_VIDEO_TYPES.MOVEMENT_FITNESS,
  EXPLORE_VIDEO_TYPES.STORY_TIME,
  EXPLORE_VIDEO_TYPES.MANNERS_ETIQUETTE,
];

const replay = { _id: 'r1', title: 'Replay one', type: 'video', videoType: 'replay', videoFile: { url: 'https://cdn.example/r1.mp4' } };

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const newStore = () => configureStore({ reducer: { childPageCache: childPageCacheReducer } });

function mount(store = newStore()) {
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/child/kid1/explore']}>
          <Routes>
            <Route path="/child/:id/explore" element={<ChildExplore childId="kid1" />} />
            <Route path="/child/:id/explore/videos/:videoType" element={<Where />} />
            <Route path="/child/:id/explore/replays" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

const flush = () => act(async () => {});
const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));
const bones = () => document.querySelectorAll('.MuiSkeleton-root');
const card = (type) => screen.getByText(VIDEO_TYPE_LABELS[type]).closest('.MuiPaper-root');
const replaysSkeleton = () => screen.queryByRole('status', { name: 'Loading replays' });

describe('Explore page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockExplore.fetchExploreContent.mockResolvedValue({ data: [{ _id: 'a' }, { _id: 'b' }] });
    mockExplore.fetchContentByType.mockResolvedValue({ response: { data: [] } });
    mockWatch.getVideoTypeProgress.mockResolvedValue({ totalVideos: 5, viewedVideos: 2 });
    mockWatch.getTotalStarsForVideoType.mockResolvedValue(30);
    mockWatch.getExploreVideoWatchStatus.mockResolvedValue({ currentWatchCount: 0 });
  });
  afterEach(() => vi.useRealTimers());

  describe('while the collections load', () => {
    beforeEach(() => {
      mockExplore.fetchExploreContent.mockReturnValue(new Promise(() => {}));
      mockWatch.getVideoTypeProgress.mockReturnValue(new Promise(() => {}));
      mockWatch.getTotalStarsForVideoType.mockReturnValue(new Promise(() => {}));
    });

    it('shows the page and all six collection cards at once, with no spinner', async () => {
      mount();

      expect(screen.getByText('What Do You Want to Learn?')).toBeInTheDocument();
      TYPES.forEach((type) => expect(screen.getByText(VIDEO_TYPE_LABELS[type])).toBeInTheDocument());
      expect(screen.getAllByText('Progress')).toHaveLength(6);
      expect(screen.queryByRole('progressbar', { name: /loading/i })).toBeNull();
      expect(document.querySelector('.MuiCircularProgress-root')).toBeNull();
    });

    it('holds only the stars, the count and the button wording with placeholders', async () => {
      mount();
      await tick(200);

      const first = within(card(EXPLORE_VIDEO_TYPES.COOKING));
      expect(card(EXPLORE_VIDEO_TYPES.COOKING).querySelectorAll('.MuiSkeleton-root')).toHaveLength(3);
      expect(first.queryByText('Start now!')).toBeNull();
      expect(first.queryByText('Continue!')).toBeNull();
      expect(first.getByRole('button')).toBeInTheDocument();
    });

    it('a card can be opened before its numbers arrive', async () => {
      mount();

      await act(async () => within(card(EXPLORE_VIDEO_TYPES.MUSIC)).getByRole('button').click());

      expect(screen.getByTestId('where')).toHaveTextContent('/child/kid1/explore/videos/music');
    });

    it('shows no placeholder for a quick answer', async () => {
      mockExplore.fetchExploreContent.mockResolvedValue({ data: [] });
      mockWatch.getVideoTypeProgress.mockResolvedValue({ totalVideos: 5, viewedVideos: 2 });
      mockWatch.getTotalStarsForVideoType.mockResolvedValue(30);

      mount();
      await flush();
      await tick(500);

      expect(bones()).toHaveLength(0);
      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('2/5')).toBeInTheDocument();
    });
  });

  describe('requests', () => {
    it('asks for each collection’s list, progress and stars together, and all six at once', async () => {
      mockExplore.fetchExploreContent.mockReturnValue(new Promise(() => {}));
      mockWatch.getVideoTypeProgress.mockReturnValue(new Promise(() => {}));
      mockWatch.getTotalStarsForVideoType.mockReturnValue(new Promise(() => {}));

      mount();
      await flush();

      expect(mockExplore.fetchExploreContent).toHaveBeenCalledTimes(6);
      expect(mockWatch.getVideoTypeProgress).toHaveBeenCalledTimes(6);
      expect(mockWatch.getTotalStarsForVideoType).toHaveBeenCalledTimes(6);
      expect(mockWatch.getVideoTypeProgress.mock.calls.map(([type]) => type).sort()).toEqual([...TYPES].sort());
    });
  });

  describe('cards fill in one by one', () => {
    it('a collection shows its numbers as soon as it arrives, while the others still wait', async () => {
      const slow = deferred();
      mockWatch.getVideoTypeProgress.mockImplementation((type) =>
        type === EXPLORE_VIDEO_TYPES.STORY_TIME ? slow.promise : Promise.resolve({ totalVideos: 5, viewedVideos: 2 })
      );

      mount();
      await tick(200);

      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('2/5')).toBeInTheDocument();
      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('Continue!')).toBeInTheDocument();
      expect(card(EXPLORE_VIDEO_TYPES.STORY_TIME).querySelectorAll('.MuiSkeleton-root')).toHaveLength(3);

      slow.resolve({ totalVideos: 8, viewedVideos: 0 });
      await flush();

      expect(within(card(EXPLORE_VIDEO_TYPES.STORY_TIME)).getByText('0/8')).toBeInTheDocument();
      expect(within(card(EXPLORE_VIDEO_TYPES.STORY_TIME)).getByText('Start now!')).toBeInTheDocument();
    });

    it('uses the list’s length when the progress service does not know the total', async () => {
      mockWatch.getVideoTypeProgress.mockResolvedValue({ totalVideos: 0, viewedVideos: 0 });

      mount();
      await flush();

      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('0/2')).toBeInTheDocument();
    });

    it('still shows progress and stars when the list itself cannot be loaded', async () => {
      mockExplore.fetchExploreContent.mockRejectedValue(new Error('Server error'));

      mount();
      await flush();

      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('2/5')).toBeInTheDocument();
      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('30')).toBeInTheDocument();
    });

    it('falls back to zeros for a collection whose data fails entirely', async () => {
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockWatch.getVideoTypeProgress.mockRejectedValue(new Error('boom'));

      mount();
      await flush();

      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('0/0')).toBeInTheDocument();
      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('Start now!')).toBeInTheDocument();
      logged.mockRestore();
    });
  });

  describe('when a video is watched', () => {
    it('updates the numbers quietly — the cards never go back to placeholders', async () => {
      mount();
      await flush();
      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('2/5')).toBeInTheDocument();

      const refresh = deferred();
      mockWatch.getVideoTypeProgress.mockReturnValue(refresh.promise);
      act(() => {
        window.dispatchEvent(new Event('childStatsUpdated'));
      });
      await tick(500);

      expect(bones()).toHaveLength(0);
      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('2/5')).toBeInTheDocument();

      refresh.resolve({ totalVideos: 5, viewedVideos: 3 });
      await flush();

      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('3/5')).toBeInTheDocument();
    });

    it('stops listening once the page is closed', async () => {
      const add = vi.spyOn(window, 'addEventListener');
      const remove = vi.spyOn(window, 'removeEventListener');
      const { unmount } = mount();
      await flush();

      unmount();

      const count = (spy) => spy.mock.calls.filter(([type]) => type === 'childStatsUpdated').length;
      expect(count(remove)).toBe(count(add));
      add.mockRestore();
      remove.mockRestore();
    });
  });

  describe('replays row', () => {
    it('shows a placeholder row after a short wait, then the replays', async () => {
      const pending = deferred();
      mockExplore.fetchContentByType.mockReturnValue(pending.promise);

      mount();
      await tick(100);
      expect(replaysSkeleton()).toBeNull();
      await tick(100);
      expect(replaysSkeleton()).toBeInTheDocument();
      expect(screen.queryByText('Loading replays...')).toBeNull();

      pending.resolve({ response: { data: [replay] } });
      await flush();

      expect(replaysSkeleton()).toBeNull();
      expect(screen.getByText('Watch Replays')).toBeInTheDocument();
      expect(screen.getByText('Replay one')).toBeInTheDocument();
    });

    it('is not shown at all when there are no replays, and never flashes for a quick answer', async () => {
      mount();
      await flush();
      await tick(500);

      expect(replaysSkeleton()).toBeNull();
      expect(screen.queryByText('Watch Replays')).toBeNull();
    });

    it('does not hold back the collections', async () => {
      mockExplore.fetchContentByType.mockReturnValue(new Promise(() => {}));

      mount();
      await flush();

      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('2/5')).toBeInTheDocument();
    });

    it('See All opens the replays page', async () => {
      mockExplore.fetchContentByType.mockResolvedValue({ response: { data: [replay] } });
      mount();
      await flush();

      await act(async () => screen.getByRole('button', { name: /See All/ }).click());

      expect(screen.getByTestId('where')).toHaveTextContent('/child/kid1/explore/replays');
    });
  });

  describe('coming back to Explore', () => {
    async function firstVisit(store) {
      mockExplore.fetchContentByType.mockResolvedValue({ response: { data: [replay] } });
      mockWatch.getExploreVideoWatchStatus.mockResolvedValue({ currentWatchCount: 4 });
      const view = mount(store);
      await flush();
      view.unmount();
    }
    const holdEverything = () => {
      mockExplore.fetchExploreContent.mockReturnValue(new Promise(() => {}));
      mockExplore.fetchContentByType.mockReturnValue(new Promise(() => {}));
      mockWatch.getVideoTypeProgress.mockReturnValue(new Promise(() => {}));
      mockWatch.getTotalStarsForVideoType.mockReturnValue(new Promise(() => {}));
    };

    it('shows the collections and the replays at once, with no placeholder, while they refresh', async () => {
      const store = newStore();
      await firstVisit(store);
      holdEverything();

      mount(store);
      await tick(500);

      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('2/5')).toBeInTheDocument();
      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('Continue!')).toBeInTheDocument();
      expect(screen.getByText('Replay one')).toBeInTheDocument();
      expect(bones()).toHaveLength(0);
      expect(replaysSkeleton()).toBeNull();
    });

    it('replaces the numbers when the refresh arrives', async () => {
      const store = newStore();
      await firstVisit(store);
      mockWatch.getVideoTypeProgress.mockResolvedValue({ totalVideos: 6, viewedVideos: 3 });

      mount(store);
      await flush();

      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('3/6')).toBeInTheDocument();
      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).queryByText('2/5')).toBeNull();
    });

    it('keeps the numbers, instead of turning them into zeros, when the refresh fails', async () => {
      const store = newStore();
      await firstVisit(store);
      mockWatch.getVideoTypeProgress.mockRejectedValue(new Error('down'));
      mockWatch.getTotalStarsForVideoType.mockRejectedValue(new Error('down'));

      mount(store);
      await flush();

      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('2/5')).toBeInTheDocument();
      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('30')).toBeInTheDocument();
    });

    it('asks quietly the second time — the lists and the replays make no popup if they fail', async () => {
      const store = newStore();
      await firstVisit(store);
      expect(mockExplore.fetchContentByType).toHaveBeenLastCalledWith(
        'video',
        expect.anything(),
        { silent: false }
      );

      mockExplore.fetchContentByType.mockClear();
      mockExplore.fetchExploreContent.mockClear();
      mount(store);
      await flush();

      expect(mockExplore.fetchContentByType).toHaveBeenCalledWith('video', expect.anything(), { silent: true });
      mockExplore.fetchExploreContent.mock.calls.forEach(([, options]) => expect(options).toEqual({ silent: true }));
    });

    it('keeps the replays row, and shows nothing, when its refresh fails', async () => {
      const store = newStore();
      await firstVisit(store);
      mockExplore.fetchContentByType.mockRejectedValue(new Error('down'));

      mount(store);
      await flush();

      expect(screen.getByText('Replay one')).toBeInTheDocument();
      expect(screen.getByText('Watch Replays')).toBeInTheDocument();
    });

    it('asks for the numbers in a way that can fail, so a failure never turns them into zeros', async () => {
      mount();
      await flush();

      TYPES.forEach((type) => {
        expect(mockWatch.getVideoTypeProgress).toHaveBeenCalledWith(type, { strict: true });
        expect(mockWatch.getTotalStarsForVideoType).toHaveBeenCalledWith(type, { strict: true });
      });
    });

    it('asks again on every visit', async () => {
      const store = newStore();
      await firstVisit(store);
      mockWatch.getVideoTypeProgress.mockClear();

      mount(store);
      await flush();

      expect(mockWatch.getVideoTypeProgress).toHaveBeenCalledTimes(6);
    });

    it('a first visit that fails shows zeros, remembers nothing, and tries again next time', async () => {
      const store = newStore();
      mockWatch.getVideoTypeProgress.mockRejectedValue(new Error('down'));
      const failed = mount(store);
      await flush();
      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('0/0')).toBeInTheDocument();
      expect(bones()).toHaveLength(0);
      failed.unmount();

      mockWatch.getVideoTypeProgress.mockResolvedValue({ totalVideos: 5, viewedVideos: 2 });
      mount(store);
      await flush();

      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('2/5')).toBeInTheDocument();
    });

    it('a stats update still refreshes the numbers quietly', async () => {
      const store = newStore();
      await firstVisit(store);
      mount(store);
      await flush();
      mockWatch.getVideoTypeProgress.mockResolvedValue({ totalVideos: 5, viewedVideos: 4 });

      await act(async () => {
        window.dispatchEvent(new Event('childStatsUpdated'));
      });

      expect(within(card(EXPLORE_VIDEO_TYPES.COOKING)).getByText('4/5')).toBeInTheDocument();
      expect(bones()).toHaveLength(0);
    });
  });
});
