/**
 * Kids Wall Hook (App)
 *
 * useKidsWall() – feed only: fetchFeed, posts, loading, error.
 * useKidsWall(childId) – feed + child mutations: createPost, updatePost, deletePost,
 * toggleLike, toggleStar (childId bound). Exposes fetchFeed and fetchChildPosts so
 * the screen can show feed or "my posts".
 */

import { useCallback, useMemo } from 'react';

import { API_BASE_URL } from '@/config';
import type {
  KidsWallPost,
  CreatePostInput,
  UpdatePostInput,
  KidsWallImage,
} from '@/services/kidswallService';
import { useKidsWallStore } from '@/store/kidswallStore';

// ---------------------------------------------------------------------------
// Helper: build full URL for post images (backend serves from same origin)
// ---------------------------------------------------------------------------

const mediaBaseUrl = API_BASE_URL.replace(/\/api\/?$/, '');

function buildMediaUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${mediaBaseUrl}${normalized}`;
}

// ---------------------------------------------------------------------------
// Hook return types
// ---------------------------------------------------------------------------

export interface UseKidsWallFeedReturn {
  posts: KidsWallPost[];
  loading: boolean;
  error: string | null;
  fetchFeed: () => Promise<KidsWallPost[]>;
  clearError: () => void;
  getPostImageUrl: (img: KidsWallImage | null | undefined) => string | null;
}

export interface UseKidsWallChildReturn extends UseKidsWallFeedReturn {
  childId: string;
  loadingMutation: boolean;
  fetchChildPosts: (childId: string) => Promise<KidsWallPost[]>;
  createPost: (
    postData: CreatePostInput,
    imageFile: { uri: string; name?: string; type?: string }
  ) => Promise<KidsWallPost | null>;
  updatePost: (
    postId: string,
    postData: UpdatePostInput,
    imageFile?: { uri: string; name?: string; type?: string }
  ) => Promise<KidsWallPost | null>;
  deletePost: (postId: string) => Promise<void>;
  toggleLike: (postId: string) => Promise<KidsWallPost | null>;
  toggleStar: (postId: string) => Promise<KidsWallPost | null>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Kids Wall: feed only (no childId) or feed + mutations (with childId).
 */
export function useKidsWall(childId?: string | null): UseKidsWallFeedReturn | UseKidsWallChildReturn {
  const {
    posts,
    loading,
    loadingMutation,
    error,
    fetchFeed,
    fetchChildPosts,
    createPost: storeCreatePost,
    updatePost: storeUpdatePost,
    deletePost: storeDeletePost,
    toggleLike: storeToggleLike,
    toggleStar: storeToggleStar,
    clearError,
  } = useKidsWallStore();

  const getPostImageUrl = useCallback((img: KidsWallImage | null | undefined): string | null => {
    if (!img?.url) return null;
    return buildMediaUrl(img.url) ?? img.url;
  }, []);

  const feedReturn: UseKidsWallFeedReturn = useMemo(
    () => ({
      posts,
      loading,
      error,
      fetchFeed,
      clearError,
      getPostImageUrl,
    }),
    [posts, loading, error, fetchFeed, clearError, getPostImageUrl]
  );

  if (childId == null || childId === '') {
    return feedReturn;
  }

  const createPost = useCallback(
    (postData: CreatePostInput, imageFile: { uri: string; name?: string; type?: string }) =>
      storeCreatePost(childId, postData, imageFile),
    [childId, storeCreatePost]
  );

  const updatePost = useCallback(
    (
      postId: string,
      postData: UpdatePostInput,
      imageFile?: { uri: string; name?: string; type?: string }
    ) => storeUpdatePost(postId, childId, postData, imageFile),
    [childId, storeUpdatePost]
  );

  const deletePost = useCallback(
    (postId: string) => storeDeletePost(postId, childId),
    [childId, storeDeletePost]
  );

  const toggleLike = useCallback(
    (postId: string) => storeToggleLike(postId, childId),
    [childId, storeToggleLike]
  );

  const toggleStar = useCallback(
    (postId: string) => storeToggleStar(postId, childId),
    [childId, storeToggleStar]
  );

  const childReturn: UseKidsWallChildReturn = useMemo(
    () => ({
      ...feedReturn,
      childId,
      loadingMutation,
      fetchChildPosts,
      createPost,
      updatePost,
      deletePost,
      toggleLike,
      toggleStar,
    }),
    [
      feedReturn,
      childId,
      loadingMutation,
      fetchChildPosts,
      createPost,
      updatePost,
      deletePost,
      toggleLike,
      toggleStar,
    ]
  );

  return childReturn;
}

export default useKidsWall;
