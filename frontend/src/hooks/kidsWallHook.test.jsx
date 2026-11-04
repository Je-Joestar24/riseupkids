/**
 * The Kids Wall hook in child mode: the feed lives in the session cache, so posting, deleting, liking
 * and starring have to keep that cached copy right. (The page itself is covered by ChildKidsWall.test.)
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import kidsWallReducer from '../store/slices/kidsWallSlice';
import uiReducer from '../store/slices/uiSlice';
import childPageCacheReducer from '../store/slices/childPageCacheSlice';
import kidsWallService from '../services/kidsWallService';
import useKidsWall from './kidsWallHook';

vi.mock('../services/kidsWallService', () => ({
  default: {
    getAllPosts: vi.fn(),
    createPost: vi.fn(),
    deletePost: vi.fn(),
    toggleLike: vi.fn(),
    toggleStar: vi.fn(),
  },
}));

const post = (id, extra = {}) => ({ _id: id, title: `Post ${id}`, likes: [], stars: [], ...extra });
const makeStore = () =>
  configureStore({
    reducer: { kidsWall: kidsWallReducer, ui: uiReducer, childPageCache: childPageCacheReducer },
  });
const wrapperFor = (store) => ({ children }) => <Provider store={store}>{children}</Provider>;
const hookFor = (store, childId = 'kid1') =>
  renderHook(() => useKidsWall(childId), { wrapper: wrapperFor(store) });

const flush = () => act(async () => {});

describe('useKidsWall — child mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kidsWallService.getAllPosts.mockResolvedValue({ data: [post('p1'), post('p2')] });
  });

  describe('the feed', () => {
    it('does not load by itself (the share page uses the hook only to post)', async () => {
      const { result } = hookFor(makeStore());
      await flush();

      expect(kidsWallService.getAllPosts).not.toHaveBeenCalled();
      expect(result.current).toMatchObject({ posts: [], loaded: false, loading: false, error: null });
    });

    it('fetchPosts loads it into the cache, and another page then sees it at once', async () => {
      const store = makeStore();
      const first = hookFor(store);
      await act(async () => {
        await first.result.current.fetchPosts();
      });
      expect(first.result.current).toMatchObject({ loaded: true });
      expect(first.result.current.posts.map((p) => p._id)).toEqual(['p1', 'p2']);

      const second = hookFor(store);
      expect(second.result.current.loaded).toBe(true);
      expect(second.result.current.posts.map((p) => p._id)).toEqual(['p1', 'p2']);
    });

    it('keeps each child’s feed apart', async () => {
      const store = makeStore();
      const one = hookFor(store, 'kid1');
      await act(async () => {
        await one.result.current.fetchPosts();
      });

      const two = hookFor(store, 'kid2');

      expect(two.result.current).toMatchObject({ loaded: false, posts: [] });
    });

    it('does not lock the share card while the feed loads', async () => {
      const store = makeStore();
      const pending = new Promise(() => {});
      kidsWallService.getAllPosts.mockReturnValue(pending);
      const { result } = hookFor(store);

      act(() => {
        result.current.fetchPosts().catch(() => {});
      });

      expect(result.current.loading).toBe(false);
    });

    it('reports a failure while nothing is cached, and rejects', async () => {
      kidsWallService.getAllPosts.mockRejectedValue(new Error('Server error'));
      const { result } = hookFor(makeStore());

      await act(async () => {
        await expect(result.current.fetchPosts()).rejects.toThrow('Server error');
      });

      expect(result.current).toMatchObject({ loaded: false, error: 'Server error' });
    });

    it('stays silent about a failed refresh, and keeps the cached feed', async () => {
      const { result } = hookFor(makeStore());
      await act(async () => {
        await result.current.fetchPosts();
      });
      kidsWallService.getAllPosts.mockRejectedValue(new Error('Server error'));

      await act(async () => {
        await expect(result.current.fetchPosts()).rejects.toThrow('Server error');
      });

      expect(result.current.error).toBeNull();
      expect(result.current.posts).toHaveLength(2);
    });
  });

  describe('posting and deleting', () => {
    it('createPost sends the post, thanks the child, and refreshes the cached feed', async () => {
      const store = makeStore();
      const { result } = hookFor(store);
      await act(async () => {
        await result.current.fetchPosts();
      });
      kidsWallService.createPost.mockResolvedValue({ data: post('p3') });
      kidsWallService.getAllPosts.mockResolvedValue({ data: [post('p3'), post('p1'), post('p2')] });

      await act(async () => {
        await result.current.createPost({ title: 'New' }, 'file');
      });

      expect(kidsWallService.createPost).toHaveBeenCalledWith('kid1', { title: 'New' }, 'file');
      expect(result.current.posts.map((p) => p._id)).toEqual(['p3', 'p1', 'p2']);
      expect(store.getState().ui.notification.message).toMatch(/grown-up/);
      expect(result.current.loading).toBe(false);
    });

    it('createPost on a share page that never loaded the feed still fills the cache', async () => {
      const store = makeStore();
      const { result } = hookFor(store);
      kidsWallService.createPost.mockResolvedValue({ data: post('p9') });

      await act(async () => {
        await result.current.createPost({ title: 'New' }, 'file');
      });

      expect(kidsWallService.getAllPosts).toHaveBeenCalledTimes(1);
      expect(result.current.loaded).toBe(true);
    });

    it('createPost that fails says so kindly, reports the error, and leaves the feed alone', async () => {
      const store = makeStore();
      const { result } = hookFor(store);
      await act(async () => {
        await result.current.fetchPosts();
      });
      kidsWallService.createPost.mockRejectedValue(new Error('Upload failed'));

      await act(async () => {
        await expect(result.current.createPost({ title: 'New' }, 'file')).rejects.toThrow('Upload failed');
      });

      expect(store.getState().ui.notification.message).toMatch(/ask a grown-up/);
      expect(result.current.error).toBe('Upload failed');
      expect(result.current.posts).toHaveLength(2);
      expect(result.current.loading).toBe(false);
    });

    it('deletePost removes it and refreshes the cached feed', async () => {
      const { result } = hookFor(makeStore());
      await act(async () => {
        await result.current.fetchPosts();
      });
      kidsWallService.deletePost.mockResolvedValue({});
      kidsWallService.getAllPosts.mockResolvedValue({ data: [post('p2')] });

      await act(async () => {
        await result.current.deletePost('p1');
      });

      expect(kidsWallService.deletePost).toHaveBeenCalledWith('p1', 'kid1');
      expect(result.current.posts.map((p) => p._id)).toEqual(['p2']);
    });
  });

  describe('likes and stars', () => {
    it.each([
      ['toggleLike', 'likes'],
      ['toggleStar', 'stars'],
    ])('%s replaces that one post in the cached feed and leaves the others', async (method, field) => {
      const store = makeStore();
      const { result } = hookFor(store);
      await act(async () => {
        await result.current.fetchPosts();
      });
      kidsWallService[method].mockResolvedValue({ data: post('p2', { [field]: [{ child: { _id: 'kid1' } }] }) });

      await act(async () => {
        await result.current[method]('p2');
      });

      expect(kidsWallService[method]).toHaveBeenCalledWith('p2', 'kid1');
      expect(result.current.posts[0][field]).toEqual([]);
      expect(result.current.posts[1][field]).toHaveLength(1);
      // It is the cached copy that changed, so another page sees it too
      expect(hookFor(store).result.current.posts[1][field]).toHaveLength(1);
    });

    it.each([['toggleLike'], ['toggleStar']])('%s that fails reports the error and keeps the feed', async (method) => {
      const { result } = hookFor(makeStore());
      await act(async () => {
        await result.current.fetchPosts();
      });
      kidsWallService[method].mockRejectedValue(new Error('Nope'));

      await act(async () => {
        await expect(result.current[method]('p1')).rejects.toThrow('Nope');
      });

      expect(result.current.error).toBe('Nope');
      expect(result.current.posts).toHaveLength(2);
    });
  });

  describe('admin mode', () => {
    it('is untouched: it works without the cache in the store and never reads it', async () => {
      const store = configureStore({ reducer: { kidsWall: kidsWallReducer, ui: uiReducer } });

      const { result } = renderHook(() => useKidsWall(), { wrapper: wrapperFor(store) });
      await flush();

      expect(result.current.posts).toEqual([]);
      expect(typeof result.current.approvePostById).toBe('function');
      expect(result.current.loaded).toBeUndefined();
    });
  });
});
