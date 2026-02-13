/**
 * Kids Wall Store (App)
 *
 * Zustand store for Kids Wall: feed (all posts) or child posts, create/update/delete,
 * toggle like/star. Tracks last fetch context so mutations can refetch correctly.
 */

import { create } from 'zustand';

import { kidswallService, toErrorMessage } from '@/services/kidswallService';
import type {
  KidsWallPost,
  CreatePostInput,
  UpdatePostInput,
} from '@/services/kidswallService';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type KidsWallFetchContext =
  | { mode: 'feed' }
  | { mode: 'child'; childId: string };

export interface KidsWallState {
  posts: KidsWallPost[];
  loading: boolean;
  loadingMutation: boolean;
  error: string | null;
  /** Last fetch context for refetch after create/delete */
  lastFetchContext: KidsWallFetchContext | null;
}

export interface KidsWallActions {
  /** Fetch feed (all approved posts) */
  fetchFeed: () => Promise<KidsWallPost[]>;
  /** Fetch posts for one child */
  fetchChildPosts: (childId: string) => Promise<KidsWallPost[]>;
  /** Create post then refetch using last context */
  createPost: (
    childId: string,
    postData: CreatePostInput,
    imageFile: { uri: string; name?: string; type?: string }
  ) => Promise<KidsWallPost | null>;
  /** Update post; returns updated post, does not replace full list */
  updatePost: (
    postId: string,
    childId: string,
    postData: UpdatePostInput,
    imageFile?: { uri: string; name?: string; type?: string }
  ) => Promise<KidsWallPost | null>;
  /** Delete post then refetch */
  deletePost: (postId: string, childId: string) => Promise<void>;
  /** Toggle like; updates post in list */
  toggleLike: (postId: string, childId: string) => Promise<KidsWallPost | null>;
  /** Toggle star; updates post in list */
  toggleStar: (postId: string, childId: string) => Promise<KidsWallPost | null>;
  clearError: () => void;
  reset: () => void;
}

const initialState: KidsWallState = {
  posts: [],
  loading: false,
  loadingMutation: false,
  error: null,
  lastFetchContext: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function replacePostInList(posts: KidsWallPost[], updated: KidsWallPost): KidsWallPost[] {
  const idx = posts.findIndex((p) => p._id === updated._id);
  if (idx === -1) return posts;
  const next = [...posts];
  next[idx] = updated;
  return next;
}

export const useKidsWallStore = create<KidsWallState & KidsWallActions>((set, get) => ({
  ...initialState,

  fetchFeed: async () => {
    set({ loading: true, error: null });
    try {
      const res = await kidswallService.getAllPosts();
      const data = res?.success && Array.isArray(res.data) ? res.data : [];
      set({
        posts: data,
        lastFetchContext: { mode: 'feed' },
        loading: false,
        error: null,
      });
      return data;
    } catch (err) {
      const msg = toErrorMessage(err);
      set({ error: msg, loading: false });
      return [];
    }
  },

  fetchChildPosts: async (childId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await kidswallService.getChildPosts(childId);
      const data = res?.success && Array.isArray(res.data) ? res.data : [];
      set({
        posts: data,
        lastFetchContext: { mode: 'child', childId },
        loading: false,
        error: null,
      });
      return data;
    } catch (err) {
      const msg = toErrorMessage(err);
      set({ error: msg, loading: false });
      return [];
    }
  },

  createPost: async (childId, postData, imageFile) => {
    set({ loadingMutation: true, error: null });
    try {
      const res = await kidswallService.createPost(childId, postData, imageFile);
      const created = res?.success && res.data ? res.data : null;
      const ctx = get().lastFetchContext;
      if (created && ctx) {
        if (ctx.mode === 'feed') {
          await get().fetchFeed();
        } else {
          await get().fetchChildPosts(ctx.childId);
        }
      }
      return created;
    } catch (err) {
      const msg = toErrorMessage(err);
      set({ error: msg });
      throw err;
    } finally {
      set({ loadingMutation: false });
    }
  },

  updatePost: async (postId, childId, postData, imageFile) => {
    set({ loadingMutation: true, error: null });
    try {
      const res = await kidswallService.updatePost(postId, childId, postData, imageFile);
      const updated = res?.success && res.data ? res.data : null;
      if (updated) {
        set((s) => ({ posts: replacePostInList(s.posts, updated), error: null }));
      }
      return updated;
    } catch (err) {
      const msg = toErrorMessage(err);
      set({ error: msg });
      throw err;
    } finally {
      set({ loadingMutation: false });
    }
  },

  deletePost: async (postId, childId) => {
    set({ loadingMutation: true, error: null });
    try {
      await kidswallService.deletePost(postId, childId);
      const ctx = get().lastFetchContext;
      if (ctx) {
        if (ctx.mode === 'feed') {
          await get().fetchFeed();
        } else {
          await get().fetchChildPosts(ctx.childId);
        }
      } else {
        set((s) => ({ posts: s.posts.filter((p) => p._id !== postId) }));
      }
      set({ error: null });
    } catch (err) {
      const msg = toErrorMessage(err);
      set({ error: msg });
      throw err;
    } finally {
      set({ loadingMutation: false });
    }
  },

  toggleLike: async (postId, childId) => {
    try {
      const res = await kidswallService.toggleLike(postId, childId);
      const updated = res?.success && res.data ? res.data : null;
      if (updated) {
        set((s) => ({ posts: replacePostInList(s.posts, updated) }));
      }
      return updated;
    } catch (err) {
      const msg = toErrorMessage(err);
      set({ error: msg });
      throw err;
    }
  },

  toggleStar: async (postId, childId) => {
    try {
      const res = await kidswallService.toggleStar(postId, childId);
      const updated = res?.success && res.data ? res.data : null;
      if (updated) {
        set((s) => ({ posts: replacePostInList(s.posts, updated) }));
      }
      return updated;
    } catch (err) {
      const msg = toErrorMessage(err);
      set({ error: msg });
      throw err;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));
