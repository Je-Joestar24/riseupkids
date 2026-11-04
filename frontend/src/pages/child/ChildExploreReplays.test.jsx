/**
 * End to end for the full replays page: the real page, header and cards; only the data hooks (network)
 * and the video player are replaced. Covers the loading card on a first visit only, the cached list
 * and each video's view count on later visits, quiet refreshes, and an empty list.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../config/theme';
import childPageCacheReducer from '../../store/slices/childPageCacheSlice';
import ChildExploreReplays from './ChildExploreReplays';

const mockExplore = {
  fetchExploreContent: vi.fn(),
  getCoverImageUrl: (path) => path,
};
const mockWatch = {
  getExploreVideoWatchStatus: vi.fn(),
  getTotalStarsForVideoType: vi.fn(),
};

vi.mock('../../hooks/exploreHook', () => ({ useExplore: () => mockExplore }));
vi.mock('../../hooks/exploreVideoWatchHook', () => ({ useExploreVideoWatch: () => mockWatch }));
vi.mock('../../components/child/common/VideoPlayerModal', () => ({ default: () => null }));

const replay = (id, title) => ({ _id: id, title, duration: 120, videoType: 'replay' });

function deferred() {
  let resolve;
  const promise = new Promise((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const newStore = () => configureStore({ reducer: { childPageCache: childPageCacheReducer } });

const tree = (store) => (
  <Provider store={store}>
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/child/kid1/explore/replays']}>
        <Routes>
          <Route path="/child/:id/explore/replays" element={<ChildExploreReplays childId="kid1" />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  </Provider>
);
const mount = (store = newStore()) => render(tree(store));

const flush = () => act(async () => {});
const loadingCard = () => screen.queryByText('Loading replays...');

describe('Replays page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExplore.fetchExploreContent.mockResolvedValue({
      data: [replay('r1', 'Story hour'), replay('r2', 'Sing along')],
    });
    mockWatch.getExploreVideoWatchStatus.mockImplementation(async (id) => ({
      currentWatchCount: id === 'r1' ? 3 : 8,
    }));
    mockWatch.getTotalStarsForVideoType.mockResolvedValue(0);
  });
  afterEach(() => vi.useRealTimers());

  describe('first visit', () => {
    it('shows the page, then the loading card, then the replays with this child’s view counts', async () => {
      const pending = deferred();
      mockExplore.fetchExploreContent.mockReturnValue(pending.promise);

      mount();
      await flush();
      expect(screen.getByText('Back to Explore')).toBeInTheDocument();
      expect(loadingCard()).toBeInTheDocument();

      pending.resolve({ data: [replay('r1', 'Story hour'), replay('r2', 'Sing along')] });
      await flush();

      expect(loadingCard()).toBeNull();
      expect(screen.getByText('Story hour')).toBeInTheDocument();
      expect(screen.getByText('3 views')).toBeInTheDocument();
      expect(screen.getByText('8 views')).toBeInTheDocument();
    });

    it('shows “No replays available yet.” only after the list has really loaded', async () => {
      mockExplore.fetchExploreContent.mockResolvedValue({ data: [] });
      expect(renderToString(tree(newStore()))).not.toContain('No replays available yet.');

      mount();
      await flush();

      expect(screen.getByText('No replays available yet.')).toBeInTheDocument();
    });

    it('asks for the list, not quietly (a failure may say so)', async () => {
      mount();
      await flush();

      expect(mockExplore.fetchExploreContent).toHaveBeenCalledWith(
        { type: 'video', videoType: 'replay', isPublished: true },
        { silent: false }
      );
    });
  });

  describe('coming back', () => {
    async function firstVisit(store) {
      const view = mount(store);
      await flush();
      view.unmount();
    }

    it('shows the replays and their view counts at once, with no loading card, while they refresh', async () => {
      const store = newStore();
      await firstVisit(store);
      mockExplore.fetchExploreContent.mockReturnValue(new Promise(() => {}));
      mockWatch.getExploreVideoWatchStatus.mockReturnValue(new Promise(() => {}));

      mount(store);
      await flush();

      expect(loadingCard()).toBeNull();
      expect(screen.getByText('Story hour')).toBeInTheDocument();
      expect(screen.getByText('3 views')).toBeInTheDocument();
    });

    it('has them from the very first render, before any request has started', async () => {
      const store = newStore();
      await firstVisit(store);

      const firstRender = renderToString(tree(store));

      expect(firstRender).toContain('Story hour');
      expect(firstRender).not.toContain('Loading replays...');
    });

    it('replaces the list and the counts when the refresh arrives', async () => {
      const store = newStore();
      await firstVisit(store);
      mockExplore.fetchExploreContent.mockResolvedValue({ data: [replay('r1', 'Story hour'), replay('r3', 'New one')] });
      mockWatch.getExploreVideoWatchStatus.mockResolvedValue({ currentWatchCount: 10 });

      mount(store);
      await flush();

      expect(screen.getByText('New one')).toBeInTheDocument();
      expect(screen.queryByText('Sing along')).toBeNull();
      expect(screen.getAllByText('10 views')).toHaveLength(2);
    });

    it('keeps the list, and shows no loading card or error, when the refresh fails', async () => {
      const store = newStore();
      await firstVisit(store);
      mockExplore.fetchExploreContent.mockRejectedValue(new Error('down'));

      mount(store);
      await flush();

      expect(loadingCard()).toBeNull();
      expect(screen.getByText('Story hour')).toBeInTheDocument();
      expect(screen.getByText('3 views')).toBeInTheDocument();
    });

    it('keeps a view count that cannot be read again, instead of dropping it to 0', async () => {
      const store = newStore();
      await firstVisit(store);
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockWatch.getExploreVideoWatchStatus.mockRejectedValue(new Error('down'));

      mount(store);
      await flush();

      expect(screen.getByText('3 views')).toBeInTheDocument();
      expect(screen.getByText('8 views')).toBeInTheDocument();
      logged.mockRestore();
    });

    it('asks quietly, so a failed refresh makes no popup', async () => {
      const store = newStore();
      await firstVisit(store);

      mount(store);
      await flush();

      expect(mockExplore.fetchExploreContent).toHaveBeenLastCalledWith(expect.anything(), { silent: true });
    });

    it('asks again on every visit', async () => {
      const store = newStore();
      await firstVisit(store);
      mockExplore.fetchExploreContent.mockClear();

      mount(store);
      await flush();

      expect(mockExplore.fetchExploreContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('the header', () => {
    it('asks for the replay stars once, in a way that can fail, and remembers the answer', async () => {
      const store = newStore();
      const first = mount(store);
      await flush();
      first.unmount();

      expect(mockWatch.getTotalStarsForVideoType).toHaveBeenCalledWith('replay', { strict: true });
      expect(store.getState().childPageCache.entries['kid1:explore:stars:replay'].data).toBe(0);
    });
  });
});
