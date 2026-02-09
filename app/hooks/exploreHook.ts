/**
 * Explore Hook (App)
 *
 * Single hook for Explore screen: exposes store state, actions, and helpers
 * (getCoverImageUrl, getVideoFileUrl, getVideoTypeLabel) for components.
 * Optimized for Replays, Video Collections, and detail views.
 */

import { useCallback, useMemo } from 'react';

import { API_BASE_URL } from '@/config';
import { getVideoTypeLabel as getVideoTypeLabelConst } from '@/constants/explore';
import type {
  ExploreContentItem,
  ExplorePagination,
  ExploreWatchStatus,
} from '@/services/exploreService';
import { useExploreStore, exploreCacheKey } from '@/store/exploreStore';

// ---------------------------------------------------------------------------
// Helpers: build full URL for media (backend serves from same origin, no /api for uploads)
// ---------------------------------------------------------------------------

const mediaBaseUrl = API_BASE_URL.replace(/\/api\/?$/, '');

function buildMediaUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${mediaBaseUrl}${normalized}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseExploreReturn {
  // State
  featuredContent: ExploreContentItem[];
  currentContent: ExploreContentItem | null;
  loadingFeatured: boolean;
  loadingCurrent: boolean;
  loadingList: boolean;
  error: string | null;

  // Actions
  fetchFeatured: (limit?: number) => Promise<ExploreContentItem[]>;
  fetchByType: (
    type: string,
    params?: { videoType?: string; page?: number; limit?: number; isFeatured?: boolean }
  ) => Promise<ExploreContentItem[]>;
  fetchById: (contentId: string) => Promise<ExploreContentItem | null>;
  fetchAll: (params?: {
    type?: string;
    videoType?: string;
    isPublished?: boolean;
    isFeatured?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) => Promise<ExploreContentItem[]>;
  clearCurrent: () => void;
  clearError: () => void;

  // Cached by-type (for Replays / Video Collections)
  getCachedByType: (type: string, params?: { videoType?: string; page?: number; limit?: number }) => ExploreContentItem[];
  getPaginationByType: (
    type: string,
    params?: { videoType?: string; page?: number; limit?: number }
  ) => ExplorePagination | undefined;
  isLoadingByType: (type: string, params?: { videoType?: string; page?: number; limit?: number }) => boolean;

  // Helpers for components
  getCoverImageUrl: (coverImagePath: string | null | undefined) => string | null;
  getVideoFileUrl: (item: ExploreContentItem) => string | null;
  getVideoTypeLabel: (videoType: string) => string;
  /** Build cache key (for when components need a stable key) */
  cacheKey: typeof exploreCacheKey;
}

export function useExplore(): UseExploreReturn {
  const {
    featuredContent,
    currentContent,
    loadingFeatured,
    loadingCurrent,
    loadingList,
    error,
    fetchFeatured,
    fetchByType,
    fetchById,
    fetchAll,
    clearCurrent,
    clearError,
    isLoadingByType: storeIsLoadingByType,
    getCachedByType: storeGetCached,
    getPaginationByType: storeGetPagination,
  } = useExploreStore();

  const getCachedByType = useCallback(
    (
      type: string,
      params?: { videoType?: string; page?: number; limit?: number }
    ): ExploreContentItem[] => {
      const key = exploreCacheKey(type, params);
      return storeGetCached(key);
    },
    [storeGetCached]
  );

  const getPaginationByType = useCallback(
    (
      type: string,
      params?: { videoType?: string; page?: number; limit?: number }
    ): ExplorePagination | undefined => {
      const key = exploreCacheKey(type, params);
      return storeGetPagination(key);
    },
    [storeGetPagination]
  );

  const isLoadingByType = useCallback(
    (
      type: string,
      params?: { videoType?: string; page?: number; limit?: number }
    ): boolean => {
      const key = exploreCacheKey(type, params);
      return storeIsLoadingByType(key);
    },
    [storeIsLoadingByType]
  );

  const getCoverImageUrl = useCallback((coverImagePath: string | null | undefined): string | null => {
    return buildMediaUrl(coverImagePath);
  }, []);

  const getVideoFileUrl = useCallback((item: ExploreContentItem): string | null => {
    const file = item?.videoFile;
    if (file?.url) return buildMediaUrl(file.url) ?? file.url;
    if (item?.videoFileUrl) return buildMediaUrl(item.videoFileUrl) ?? item.videoFileUrl;
    return null;
  }, []);

  const getVideoTypeLabel = useCallback((videoType: string): string => {
    return getVideoTypeLabelConst(videoType);
  }, []);

  return useMemo(
    () => ({
      featuredContent,
      currentContent,
      loadingFeatured,
      loadingCurrent,
      loadingList,
      error,
      fetchFeatured,
      fetchByType,
      fetchById,
      fetchAll,
      clearCurrent,
      clearError,
      getCachedByType,
      getPaginationByType,
      isLoadingByType,
      getCoverImageUrl,
      getVideoFileUrl,
      getVideoTypeLabel,
      cacheKey: exploreCacheKey,
    }),
    [
      featuredContent,
      currentContent,
      loadingFeatured,
      loadingCurrent,
      loadingList,
      error,
      fetchFeatured,
      fetchByType,
      fetchById,
      fetchAll,
      clearCurrent,
      clearError,
      getCachedByType,
      getPaginationByType,
      isLoadingByType,
      getCoverImageUrl,
      getVideoFileUrl,
      getVideoTypeLabel,
    ]
  );
}

export default useExplore;

// ---------------------------------------------------------------------------
// Explore Video Watch hook (per child)
// ---------------------------------------------------------------------------

export interface UseExploreVideoWatchReturn {
  loading: boolean;
  error: string | null;
  markExploreVideoWatched: (
    exploreContentId: string,
    completionPercentage?: number,
    videoType?: string
  ) => Promise<unknown>;
  getExploreVideoWatchStatus: (
    exploreContentId: string
  ) => Promise<ExploreWatchStatus | null>;
  getTotalStarsForVideoType: (videoType: string) => Promise<number>;
  getVideoTypeProgress: (
    videoType: string
  ) => Promise<{ totalVideos: number; viewedVideos: number }>;
  clearErrorWatch: () => void;
}

/**
 * Explore video watch tracking for a specific child.
 * Use with useExplore() for content; call markExploreVideoWatched when video completes.
 * Pass videoType when marking so progress/totalStars cache for that type is invalidated.
 */
export function useExploreVideoWatch(childId: string | null | undefined): UseExploreVideoWatchReturn {
  const {
    loadingWatch,
    errorWatch,
    markExploreVideoWatched: storeMarkWatched,
    getExploreVideoWatchStatus: storeGetStatus,
    getVideoTypeProgress: storeGetProgress,
    getTotalStarsForVideoType: storeGetTotalStars,
    clearErrorWatch,
  } = useExploreStore();

  const markExploreVideoWatched = useCallback(
    async (
      exploreContentId: string,
      completionPercentage: number = 100,
      videoType?: string
    ) => {
      if (!childId) throw new Error('Child ID is required');
      return storeMarkWatched(
        childId,
        exploreContentId,
        completionPercentage,
        videoType
      );
    },
    [childId, storeMarkWatched]
  );

  const getExploreVideoWatchStatus = useCallback(
    async (exploreContentId: string): Promise<ExploreWatchStatus | null> => {
      if (!childId) throw new Error('Child ID is required');
      return storeGetStatus(childId, exploreContentId);
    },
    [childId, storeGetStatus]
  );

  const getVideoTypeProgress = useCallback(
    async (
      videoType: string
    ): Promise<{ totalVideos: number; viewedVideos: number }> => {
      if (!childId) return { totalVideos: 0, viewedVideos: 0 };
      return storeGetProgress(childId, videoType);
    },
    [childId, storeGetProgress]
  );

  const getTotalStarsForVideoType = useCallback(
    async (videoType: string): Promise<number> => {
      if (!childId) return 0;
      return storeGetTotalStars(childId, videoType);
    },
    [childId, storeGetTotalStars]
  );

  return useMemo(
    () => ({
      loading: loadingWatch,
      error: errorWatch,
      markExploreVideoWatched,
      getExploreVideoWatchStatus,
      getTotalStarsForVideoType,
      getVideoTypeProgress,
      clearErrorWatch,
    }),
    [
      loadingWatch,
      errorWatch,
      markExploreVideoWatched,
      getExploreVideoWatchStatus,
      getTotalStarsForVideoType,
      getVideoTypeProgress,
      clearErrorWatch,
    ]
  );
}
