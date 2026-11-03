/**
 * End to end for the Kids Wall page: the real page, hooks, store and cards; only the network services
 * are replaced. Covers what stays on screen while loading, the feed placeholder, the consent wording
 * waiting for the profile, the empty message appearing only after a real load, and retry.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import kidsWallReducer from '../../store/slices/kidsWallSlice';
import uiReducer from '../../store/slices/uiSlice';
import kidsWallService from '../../services/kidsWallService';
import childrenService from '../../services/childrenService';
import {
  KIDS_WALL_UPLOAD_DISABLED_BUTTON,
  KIDS_WALL_UPLOAD_DISABLED_SUBTITLE,
} from '../../constants/kidsWallConsent';
import ChildKidsWall from './ChildKidsWall';

vi.mock('../../services/kidsWallService', () => ({
  default: { getAllPosts: vi.fn(), toggleLike: vi.fn(), toggleStar: vi.fn() },
}));
vi.mock('../../services/childrenService', () => ({ default: { getChildById: vi.fn() } }));

const post = (id, title, extra = {}) => ({
  _id: id,
  title,
  content: `About ${title}`,
  child: { displayName: 'Sam', age: 6 },
  likes: [],
  stars: [],
  ...extra,
});
const enabledChild = { _id: 'kid1', kidsWallEnabled: true, kidsWallConsentAt: '2026-01-01T00:00:00Z' };

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
  const store = configureStore({ reducer: { kidsWall: kidsWallReducer, ui: uiReducer } });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/child/kid1/wall']}>
        <Routes>
          <Route path="/child/:id/wall" element={<ChildKidsWall childId="kid1" />} />
          <Route path="/child/:id/wall/share" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
}

const flush = () => act(async () => {});
const tick = (ms) => act(async () => vi.advanceTimersByTime(ms));
const feedSkeleton = () => screen.queryByRole('status', { name: 'Loading posts' });
const emptyMessage = () => screen.queryByText(/No posts yet/);

describe('Kids Wall page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.useFakeTimers();
    kidsWallService.getAllPosts.mockResolvedValue({ data: [post('p1', 'My drawing')] });
    childrenService.getChildById.mockResolvedValue({ data: enabledChild });
  });
  afterEach(() => vi.useRealTimers());

  describe('while the posts load', () => {
    beforeEach(() => {
      kidsWallService.getAllPosts.mockReturnValue(new Promise(() => {}));
    });

    it('shows the header and share card at once, with no spinner', async () => {
      mount();

      expect(screen.getByText('Share Your Amazing Work!')).toBeInTheDocument();
      expect(document.querySelector('.MuiCircularProgress-root')).toBeNull();
    });

    it('never flashes "No posts yet" before the feed has loaded — not even on the very first render', async () => {
      // renderToString is the first render only (no effects have run yet), which is what the child's
      // browser paints before the request starts.
      const store = configureStore({ reducer: { kidsWall: kidsWallReducer, ui: uiReducer } });
      const firstRender = renderToString(
        <Provider store={store}>
          <MemoryRouter>
            <ChildKidsWall childId="kid1" />
          </MemoryRouter>
        </Provider>
      );
      expect(firstRender).not.toContain('No posts yet');

      mount();
      await tick(500);

      expect(emptyMessage()).toBeNull();
    });

    it('shows the feed placeholder after a short wait, not before', async () => {
      mount();
      await tick(100);
      expect(feedSkeleton()).toBeNull();

      await tick(100);
      expect(feedSkeleton()).toBeInTheDocument();
    });

    it('shows the posts and removes the placeholder when the feed arrives', async () => {
      const pending = deferred();
      kidsWallService.getAllPosts.mockReturnValue(pending.promise);
      mount();
      await tick(200);
      expect(feedSkeleton()).toBeInTheDocument();

      pending.resolve({ data: [post('p1', 'My drawing'), post('p2', 'My painting')] });
      await flush();

      expect(feedSkeleton()).toBeNull();
      expect(screen.getByText('My drawing')).toBeInTheDocument();
      expect(screen.getByText('My painting')).toBeInTheDocument();
    });
  });

  describe('the share card and the parent’s consent', () => {
    it('does not say sharing is blocked while the profile is still loading', async () => {
      childrenService.getChildById.mockReturnValue(new Promise(() => {}));

      mount();
      await tick(500);

      expect(screen.queryByText(KIDS_WALL_UPLOAD_DISABLED_BUTTON)).toBeNull();
      expect(screen.queryByText(KIDS_WALL_UPLOAD_DISABLED_SUBTITLE)).toBeNull();
      expect(screen.queryByText('Ask a grown-up to help you share!')).toBeNull();
      expect(screen.queryByText('Share Something Cool!')).toBeNull();
    });

    it('lets the child share once consent is confirmed', async () => {
      mount();
      await flush();

      await act(async () => screen.getByRole('button', { name: 'Share Something Cool!' }).click());

      expect(screen.getByTestId('where')).toHaveTextContent('/child/kid1/wall/share');
    });

    it('says sharing is blocked when the parent has not allowed it', async () => {
      childrenService.getChildById.mockResolvedValue({ data: { _id: 'kid1', kidsWallEnabled: false } });

      mount();
      await flush();

      expect(screen.getByText(KIDS_WALL_UPLOAD_DISABLED_BUTTON)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: KIDS_WALL_UPLOAD_DISABLED_BUTTON })).toBeDisabled();
    });

    it('uses the profile already known from this session straight away', async () => {
      sessionStorage.setItem('selectedChild', JSON.stringify(enabledChild));
      childrenService.getChildById.mockReturnValue(new Promise(() => {}));

      mount();

      expect(screen.getByRole('button', { name: 'Share Something Cool!' })).toBeInTheDocument();
    });
  });

  describe('an empty feed', () => {
    it('shows the empty message only once the feed has loaded with no posts', async () => {
      kidsWallService.getAllPosts.mockResolvedValue({ data: [] });

      mount();
      await flush();

      expect(emptyMessage()).toBeInTheDocument();
      expect(feedSkeleton()).toBeNull();
    });
  });

  describe('when the feed cannot be loaded', () => {
    it('shows the message with Try again instead of the placeholder, and no empty message', async () => {
      kidsWallService.getAllPosts.mockRejectedValue('Network down');

      mount();
      await tick(500);

      expect(screen.getByRole('alert')).toHaveTextContent('Network down');
      expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
      expect(feedSkeleton()).toBeNull();
      expect(emptyMessage()).toBeNull();
    });

    it('Try again loads the posts', async () => {
      kidsWallService.getAllPosts.mockRejectedValueOnce('Network down');
      mount();
      await flush();

      kidsWallService.getAllPosts.mockResolvedValueOnce({ data: [post('p1', 'My drawing')] });
      await act(async () => screen.getByRole('button', { name: 'Try again' }).click());

      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByText('My drawing')).toBeInTheDocument();
    });
  });

  describe('photos', () => {
    const withPhoto = (id) => post(id, `Photo ${id}`, { images: [{ url: `/uploads/${id}.png` }] });
    const six = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

    it('loads the first four photos at once and the rest one after another', async () => {
      kidsWallService.getAllPosts.mockResolvedValue({ data: six.map(withPhoto) });

      mount();
      await flush();

      for (const id of six.slice(0, 4)) {
        const img = screen.getByAltText(`Photo ${id}`);
        expect(img.getAttribute('src')).toMatch(new RegExp(`/uploads/${id}\\.png$`));
        expect(img).toHaveAttribute('fetchpriority', 'high');
      }
      expect(screen.queryByAltText('Photo p5')).toBeNull();

      await tick(150);
      expect(screen.getByAltText('Photo p5')).toHaveAttribute('fetchpriority', 'low');
      expect(screen.queryByAltText('Photo p6')).toBeNull();
      await tick(150);
      expect(screen.getByAltText('Photo p6')).toBeInTheDocument();
    });

    it('accepts a photo stored by file path, and a full web address', async () => {
      kidsWallService.getAllPosts.mockResolvedValue({
        data: [
          post('a', 'By path', { images: [{ filePath: 'uploads/a.png' }] }),
          post('b', 'By address', { images: [{ url: 'https://cdn.example/b.png' }] }),
        ],
      });

      mount();
      await flush();

      expect(screen.getByAltText('By path').getAttribute('src')).toMatch(/\/uploads\/a\.png$/);
      expect(screen.getByAltText('By address')).toHaveAttribute('src', 'https://cdn.example/b.png');
    });

    it('shows a post without a photo as text only', async () => {
      mount();
      await flush();

      expect(screen.getByText('My drawing')).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: 'My drawing' })).toBeNull();
    });
  });

  describe('liking a post', () => {
    it('updates that post in place, and the rest of the feed stays', async () => {
      kidsWallService.getAllPosts.mockResolvedValue({ data: [post('p1', 'My drawing'), post('p2', 'My painting')] });
      kidsWallService.toggleLike.mockResolvedValue({
        data: post('p1', 'My drawing', { likes: [{ child: { _id: 'kid1' } }] }),
      });
      mount();
      await flush();

      await act(async () => screen.getAllByRole('button', { name: 'Like' })[0].click());

      expect(kidsWallService.toggleLike).toHaveBeenCalledWith('p1', 'kid1');
      expect(screen.getByText('My painting')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Like' })[0]).toHaveTextContent('1');
    });
  });
});
