/**
 * End to end for the Explore video list page: the real page, header, share card and cards; only the
 * data hooks (network), the profile lookup and the video player are replaced. Covers what stays on
 * screen while loading, the card placeholders, per-card watched state, errors and quiet refreshes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../config/theme';
import uiReducer from '../../store/slices/uiSlice';
import childPageCacheReducer from '../../store/slices/childPageCacheSlice';
import { aspectRatioOf } from '../../test/aspectRatioOf';
import ChildExploreVideos from './ChildExploreVideos';

const mockExplore = {
  fetchExploreContent: vi.fn(),
  getCoverImageUrl: (path) => path,
};
const mockWatch = {
  getTotalStarsForVideoType: vi.fn(),
  getExploreVideoWatchStatus: vi.fn(),
};

vi.mock('../../hooks/exploreHook', () => ({ useExplore: () => mockExplore }));
vi.mock('../../hooks/exploreVideoWatchHook', () => ({ useExploreVideoWatch: () => mockWatch }));
vi.mock('../../hooks/useChildProfile', () => ({
  default: () => ({ kidsWallEnabled: true }),
  useChildProfile: () => ({ kidsWallEnabled: true }),
}));
vi.mock('../../components/child/common/VideoPlayerModal', () => ({
  default: ({ open, video }) => (open ? <div data-testid="player">{video?.title}</div> : null),
}));

const video = (id, title, extra = {}) => ({ _id: id, title, description: `About ${title}`, duration: 120, ...extra });

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const newStore = () => configureStore({ reducer: { ui: uiReducer, childPageCache: childPageCacheReducer } });

const tree = (store = newStore()) => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/child/kid1/explore/videos/cooking']}>
          <Routes>
            <Route path="/child/:id/explore/videos/:videoType" element={<ChildExploreVideos childId="kid1" />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};
const mount = (store) => render(tree(store));

const flush = () => act(async () => {});
const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));
const listSkeleton = () => screen.queryByRole('status', { name: 'Loading videos' });
const emptyMessage = () => screen.queryByText('No Videos Available Yet');
const cardOf = (title) => screen.getByText(title).closest('.MuiPaper-root');

describe('Explore video list page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockExplore.fetchExploreContent.mockResolvedValue({
      data: [video('v1', 'Pancakes'), video('v2', 'Smoothie')],
    });
    mockWatch.getTotalStarsForVideoType.mockResolvedValue(30);
    mockWatch.getExploreVideoWatchStatus.mockResolvedValue({ currentWatchCount: 0, starsAwarded: false });
  });
  afterEach(() => vi.useRealTimers());

  describe('while the list loads', () => {
    beforeEach(() => {
      mockExplore.fetchExploreContent.mockReturnValue(new Promise(() => {}));
      mockWatch.getTotalStarsForVideoType.mockReturnValue(new Promise(() => {}));
    });

    it('shows the header and share card at once, with no spinner or loading text', async () => {
      mount();

      expect(screen.getByText('Cooking')).toBeInTheDocument();
      expect(screen.getByText('Total Stars Earned')).toBeInTheDocument();
      expect(screen.getByText('Made Something Tasty?')).toBeInTheDocument();
      expect(document.querySelector('.MuiCircularProgress-root')).toBeNull();
      expect(screen.queryByText('Loading videos...')).toBeNull();
    });

    it('holds the star total with a placeholder instead of showing a wrong 0', async () => {
      mount();
      await tick(200);

      expect(screen.queryByText('0')).toBeNull();
    });

    it('shows six card placeholders after a short wait, not before', async () => {
      mount();
      await tick(100);
      expect(listSkeleton()).toBeNull();

      await tick(100);
      expect(listSkeleton()).toBeInTheDocument();
      // 6 x (cover + duration badge + title + 2 text lines + button)
      expect(listSkeleton().querySelectorAll('.MuiSkeleton-root')).toHaveLength(6 * 6);
    });

    it('never flashes the empty message — not even on the very first render', async () => {
      expect(renderToString(tree())).not.toContain('No Videos Available Yet');

      mount();
      await tick(500);

      expect(emptyMessage()).toBeNull();
    });
  });

  describe('when the list arrives', () => {
    it('shows the cards at once, while each card’s watched state is still on its way', async () => {
      mockWatch.getExploreVideoWatchStatus.mockReturnValue(new Promise(() => {}));

      mount();
      await flush();

      expect(listSkeleton()).toBeNull();
      expect(screen.getByText('Pancakes')).toBeInTheDocument();
      expect(screen.getByText('Smoothie')).toBeInTheDocument();
      expect(within(cardOf('Pancakes')).queryByText('Start Lesson')).toBeNull();
      expect(within(cardOf('Pancakes')).queryByText('Review Lesson')).toBeNull();
      expect(within(cardOf('Pancakes')).getByRole('button')).toBeInTheDocument();
    });

    it('a card can be opened before its watched state arrives', async () => {
      mockWatch.getExploreVideoWatchStatus.mockReturnValue(new Promise(() => {}));
      mount();
      await flush();

      await act(async () => within(cardOf('Pancakes')).getByRole('button').click());

      expect(screen.getByTestId('player')).toHaveTextContent('Pancakes');
    });

    it('asks for every video’s watched state together, not one after another', async () => {
      mockWatch.getExploreVideoWatchStatus.mockReturnValue(new Promise(() => {}));

      mount();
      await flush();

      expect(mockExplore.fetchExploreContent).toHaveBeenCalledTimes(1);
      expect(mockWatch.getExploreVideoWatchStatus.mock.calls.map(([id]) => id).sort()).toEqual(['v1', 'v2']);
    });

    it('each card shows its own state as it arrives', async () => {
      const slow = deferred();
      mockWatch.getExploreVideoWatchStatus.mockImplementation((id) =>
        id === 'v2' ? slow.promise : Promise.resolve({ currentWatchCount: 2, starsAwarded: true })
      );

      mount();
      await flush();

      expect(within(cardOf('Pancakes')).getByText('Review Lesson')).toBeInTheDocument();
      expect(within(cardOf('Smoothie')).queryByText('Start Lesson')).toBeNull();

      slow.resolve({ currentWatchCount: 0, starsAwarded: false });
      await flush();

      expect(within(cardOf('Smoothie')).getByText('Start Lesson')).toBeInTheDocument();
    });

    it('treats a video whose status cannot be read as not watched', async () => {
      mockWatch.getExploreVideoWatchStatus.mockRejectedValue(new Error('boom'));

      mount();
      await flush();

      expect(within(cardOf('Pancakes')).getByText('Start Lesson')).toBeInTheDocument();
    });

    it('shows the star total once it arrives', async () => {
      mount();
      await flush();

      expect(screen.getByText('30')).toBeInTheDocument();
    });
  });

  describe('cover pictures', () => {
    const six = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'];

    it('loads the first four covers at once and the rest one after another', async () => {
      mockExplore.fetchExploreContent.mockResolvedValue({
        data: six.map((id) => video(id, `Video ${id}`, { coverImage: `/uploads/${id}.png` })),
      });

      mount();
      await flush();

      for (const id of six.slice(0, 4)) {
        expect(screen.getByAltText(`Video ${id}`)).toHaveAttribute('fetchpriority', 'high');
      }
      expect(screen.queryByAltText('Video v5')).toBeNull();

      await tick(150);
      expect(screen.getByAltText('Video v5')).toHaveAttribute('fetchpriority', 'low');
      await tick(150);
      expect(screen.getByAltText('Video v6')).toBeInTheDocument();
    });

    it('keeps the card at the standard cover shape until the picture says otherwise', async () => {
      mockExplore.fetchExploreContent.mockResolvedValue({
        data: [video('v1', 'Pancakes', { coverImage: '/uploads/v1.png' })],
      });

      mount();
      await flush();

      expect(aspectRatioOf(screen.getByAltText('Pancakes').parentElement)).toBe('4 / 3');
    });
  });

  describe('an empty list', () => {
    it('shows the empty message only after the list has loaded with no videos', async () => {
      mockExplore.fetchExploreContent.mockResolvedValue({ data: [] });

      mount();
      await flush();

      expect(emptyMessage()).toBeInTheDocument();
      expect(listSkeleton()).toBeNull();
    });
  });

  describe('when the list cannot be loaded', () => {
    it('shows the message with Try again — not the empty message', async () => {
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockExplore.fetchExploreContent.mockRejectedValue(new Error('Server error'));

      mount();
      await tick(500);

      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
      expect(emptyMessage()).toBeNull();
      expect(listSkeleton()).toBeNull();
      logged.mockRestore();
    });

    it('Try again loads the videos', async () => {
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockExplore.fetchExploreContent.mockRejectedValueOnce(new Error('Server error'));
      mount();
      await flush();

      await act(async () => screen.getByRole('button', { name: 'Try again' }).click());

      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByText('Pancakes')).toBeInTheDocument();
      logged.mockRestore();
    });
  });

  describe('when a video is watched', () => {
    it('updates the star total quietly — it never goes back to a placeholder', async () => {
      mount();
      await flush();
      expect(screen.getByText('30')).toBeInTheDocument();

      const refresh = deferred();
      mockWatch.getTotalStarsForVideoType.mockReturnValue(refresh.promise);
      act(() => {
        window.dispatchEvent(new Event('childStatsUpdated'));
      });
      await tick(500);

      expect(screen.getByText('30')).toBeInTheDocument();

      refresh.resolve(40);
      await flush();
      expect(screen.getByText('40')).toBeInTheDocument();
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

  describe('coming back to a video list', () => {
    async function firstVisit(store) {
      mockWatch.getExploreVideoWatchStatus.mockImplementation(async (id) =>
        id === 'v1' ? { currentWatchCount: 2, starsAwarded: true } : { currentWatchCount: 0, starsAwarded: false }
      );
      const view = mount(store);
      await flush();
      view.unmount();
    }
    const holdEverything = () => {
      mockExplore.fetchExploreContent.mockReturnValue(new Promise(() => {}));
      mockWatch.getTotalStarsForVideoType.mockReturnValue(new Promise(() => {}));
      mockWatch.getExploreVideoWatchStatus.mockReturnValue(new Promise(() => {}));
    };

    it('shows the cards, each watched state and the star total at once, with no placeholder', async () => {
      const store = newStore();
      await firstVisit(store);
      holdEverything();

      mount(store);
      await tick(500);

      expect(within(cardOf('Pancakes')).getByText('Review Lesson')).toBeInTheDocument();
      expect(within(cardOf('Smoothie')).getByText('Start Lesson')).toBeInTheDocument();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(listSkeleton()).toBeNull();
      expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(0);
    });

    it('has the cards from the very first render, before any request has started', async () => {
      const store = newStore();
      await firstVisit(store);

      expect(renderToString(tree(store))).toContain('Pancakes');
    });

    it('replaces the list when the refresh arrives, and asks only for the new video’s watched state', async () => {
      const store = newStore();
      await firstVisit(store);
      mockWatch.getExploreVideoWatchStatus.mockClear();
      mockWatch.getExploreVideoWatchStatus.mockResolvedValue({ currentWatchCount: 0, starsAwarded: false });
      mockExplore.fetchExploreContent.mockResolvedValue({
        data: [video('v1', 'Pancakes'), video('v2', 'Smoothie'), video('v3', 'Salad')],
      });

      mount(store);
      await flush();

      expect(screen.getByText('Salad')).toBeInTheDocument();
      // The three videos are asked for once each at the start of the visit and the new one again after the
      // refresh: v1 and v2 are not asked for a second time when the refreshed list arrives.
      const asked = mockWatch.getExploreVideoWatchStatus.mock.calls.map(([id]) => id);
      expect(asked.filter((id) => id === 'v1')).toHaveLength(1);
      expect(asked.filter((id) => id === 'v2')).toHaveLength(1);
      expect(asked.filter((id) => id === 'v3')).toHaveLength(1);
    });

    it('keeps the list and the stars, and shows nothing, when the refresh fails', async () => {
      const store = newStore();
      await firstVisit(store);
      mockExplore.fetchExploreContent.mockRejectedValue(new Error('down'));
      mockWatch.getTotalStarsForVideoType.mockRejectedValue(new Error('down'));
      mockWatch.getExploreVideoWatchStatus.mockRejectedValue(new Error('down'));

      mount(store);
      await flush();

      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(within(cardOf('Pancakes')).getByText('Review Lesson')).toBeInTheDocument();
      expect(within(cardOf('Smoothie')).getByText('Start Lesson')).toBeInTheDocument();
    });

    it('asks quietly the second time, so a failed refresh makes no popup', async () => {
      const store = newStore();
      await firstVisit(store);
      expect(mockExplore.fetchExploreContent).toHaveBeenLastCalledWith(expect.anything(), { silent: false });

      mount(store);
      await flush();

      expect(mockExplore.fetchExploreContent).toHaveBeenLastCalledWith(expect.anything(), { silent: true });
    });

    it('asks for the star total in a way that can fail, so a failure never turns it into 0', async () => {
      mount();
      await flush();

      expect(mockWatch.getTotalStarsForVideoType).toHaveBeenCalledWith('cooking', { strict: true });
    });

    it('a first visit whose star total fails shows 0, not a placeholder, and remembers nothing', async () => {
      const store = newStore();
      mockWatch.getTotalStarsForVideoType.mockRejectedValue(new Error('down'));
      const failed = mount(store);
      await flush();
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
      expect(store.getState().childPageCache.entries['kid1:explore:stars:cooking']).toBeUndefined();
      failed.unmount();

      mockWatch.getTotalStarsForVideoType.mockResolvedValue(30);
      mount(store);
      await flush();

      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('remembers an empty list too: the empty message is there at once', async () => {
      const store = newStore();
      mockExplore.fetchExploreContent.mockResolvedValue({ data: [] });
      const view = mount(store);
      await flush();
      view.unmount();
      holdEverything();

      mount(store);

      expect(emptyMessage()).toBeInTheDocument();
      expect(listSkeleton()).toBeNull();
    });
  });
});
