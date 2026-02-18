/**
 * Explore Store (App)
 *
 * Zustand store for Explore content — child/parent read-only.
 * Caches featured content and content-by-type (keyed by type + videoType + page + limit)
 * for efficient reuse across ExploreReplays, ExploreVideoCollections, and detail screen.
 */

import { create } from 'zustand';

import { exploreService } from '@/services/exploreService';
import { homeService } from '@/services/homeService';
import type {
  ExploreContentItem,
  ExploreListParams,
  ExplorePagination,
  ExploreWatchStatus,
} from '@/services/exploreService';

// ---------------------------------------------------------------------------
// Cache key for "by type" requests — same key = same list (enables dedupe & reuse)
// ---------------------------------------------------------------------------

export function exploreCacheKey(
  type: string,
  params?: { videoType?: string; page?: number; limit?: number }
): string {
  const videoType = params?.videoType ?? '';
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  return `${type}_${videoType}_${page}_${limit}`;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface ExploreState {
  /** Featured items (from GET /explore/featured) */
  featuredContent: ExploreContentItem[];
  /** Cached lists by cache key (e.g. video_replay_1_4) */
  contentByType: Record<string, ExploreContentItem[]>;
  /** Pagination per cache key */
  contentByTypePagination: Record<string, ExplorePagination>;
  /** Single item for detail view */
  currentContent: ExploreContentItem | null;
  /** Loading: featured */
  loadingFeatured: boolean;
  /** Loading: by-type fetches (key = cache key) */
  loadingByType: Record<string, boolean>;
  /** Loading: single item (fetchById) */
  loadingCurrent: boolean;
  /** Loading: list (fetchAll) */
  loadingList: boolean;
  /** Last error message */
  error: string | null;

  /** Explore video watch: status by key `${childId}_${exploreContentId}` */
  watchStatusCache: Record<string, ExploreWatchStatus>;
  /** Progress by key `${childId}_${videoType}` */
  progressByVideoType: Record<string, { totalVideos: number; viewedVideos: number }>;
  /** Total stars by key `${childId}_${videoType}` */
  totalStarsByVideoType: Record<string, number>;
  /** Loading for video watch operations */
  loadingWatch: boolean;
  /** Error for video watch */
  errorWatch: string | null;
  /** Timestamp when explore stars were last awarded (so header/home can refresh overall stars) */
  lastExploreStarsAwardedAt: number | null;
  /** Child overall total stars (for header nav); keyed by childId */
  childTotalStars: Record<string, number>;
}

export interface ExploreActions {
  /** Fetch featured content */
  fetchFeatured: (limit?: number) => Promise<ExploreContentItem[]>;
  /** Fetch content by type (and optional videoType); cached by key */
  fetchByType: (
    type: string,
    params?: { videoType?: string; page?: number; limit?: number; isFeatured?: boolean }
  ) => Promise<ExploreContentItem[]>;
  /** Fetch single content by ID */
  fetchById: (contentId: string) => Promise<ExploreContentItem | null>;
  /** Fetch all with params (e.g. for a full list); not cached by key */
  fetchAll: (params?: ExploreListParams) => Promise<ExploreContentItem[]>;
  /** Clear current content (e.g. on leave detail) */
  clearCurrent: () => void;
  /** Clear error */
  clearError: () => void;
  /** Check if a by-type key is loading */
  isLoadingByType: (key: string) => boolean;
  /** Get cached list by key */
  getCachedByType: (key: string) => ExploreContentItem[];
  /** Get pagination by key */
  getPaginationByType: (key: string) => ExplorePagination | undefined;

  /** Mark explore video as watched; optional videoType to invalidate progress/totalStars cache */
  markExploreVideoWatched: (
    childId: string,
    exploreContentId: string,
    completionPercentage?: number,
    videoType?: string
  ) => Promise<unknown>;
  /** Get watch status (cached or fetch) */
  getExploreVideoWatchStatus: (
    childId: string,
    exploreContentId: string
  ) => Promise<ExploreWatchStatus | null>;
  /** Get progress for video type (cached or fetch) */
  getVideoTypeProgress: (
    childId: string,
    videoType: string
  ) => Promise<{ totalVideos: number; viewedVideos: number }>;
  /** Get total stars for video type (cached or fetch) */
  getTotalStarsForVideoType: (childId: string, videoType: string) => Promise<number>;
  /** Clear video watch error */
  clearErrorWatch: () => void;
  /** Fetch and store child overall total stars (used by header); returns current value. */
  fetchChildTotalStars: (childId: string) => Promise<number>;
}

const initialState: ExploreState = {
  featuredContent: [],
  contentByType: {},
  contentByTypePagination: {},
  currentContent: null,
  loadingFeatured: false,
  loadingByType: {},
  loadingCurrent: false,
  loadingList: false,
  error: null,
  watchStatusCache: {},
  progressByVideoType: {},
  totalStarsByVideoType: {},
  loadingWatch: false,
  errorWatch: null,
  lastExploreStarsAwardedAt: null,
  childTotalStars: {},
};

export const useExploreStore = create<ExploreState & ExploreActions>((set, get) => ({
  ...initialState,

  fetchFeatured: async (limit = 10) => {
    set({ loadingFeatured: true, error: null });
    try {
      const res = await exploreService.getFeatured(limit);
      const data = res?.success && Array.isArray(res.data) ? res.data : [];
      set({ featuredContent: data, loadingFeatured: false, error: null });
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, loadingFeatured: false });
      return [];
    }
  },

  fetchByType: async (type, params = {}) => {
    const key = exploreCacheKey(type, params);
    set((s) => ({
      loadingByType: { ...s.loadingByType, [key]: true },
      error: null,
    }));
    try {
      const res = await exploreService.getByType(type, params);
      const data = res?.success && Array.isArray(res.data) ? res.data : [];
      const pagination = res?.pagination;
      set((s) => ({
        contentByType: { ...s.contentByType, [key]: data },
        contentByTypePagination: pagination
          ? { ...s.contentByTypePagination, [key]: pagination }
          : s.contentByTypePagination,
        loadingByType: { ...s.loadingByType, [key]: false },
        error: null,
      }));
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set((s) => ({
        loadingByType: { ...s.loadingByType, [key]: false },
        error: msg,
      }));
      return [];
    }
  },

  fetchById: async (contentId) => {
    set({ loadingCurrent: true, error: null });
    try {
      const res = await exploreService.getById(contentId);
      const data = res?.success && res.data ? res.data : null;
      set({ currentContent: data, loadingCurrent: false, error: null });
      return data ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, loadingCurrent: false, currentContent: null });
      return null;
    }
  },

  fetchAll: async (params = {}) => {
    set({ loadingList: true, error: null });
    try {
      const res = await exploreService.getAll(params);
      const data = res?.success && Array.isArray(res.data) ? res.data : [];
      set({ loadingList: false, error: null });
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, loadingList: false });
      return [];
    }
  },

  clearCurrent: () => set({ currentContent: null }),

  clearError: () => set({ error: null }),

  isLoadingByType: (key) => get().loadingByType[key] === true,

  getCachedByType: (key) => get().contentByType[key] ?? [],

  getPaginationByType: (key) => get().contentByTypePagination[key],

  // -------------------------------------------------------------------------
  // Explore Video Watch
  // -------------------------------------------------------------------------

  markExploreVideoWatched: async (
    childId,
    exploreContentId,
    completionPercentage = 100,
    videoType
  ) => {
    set({ loadingWatch: true, errorWatch: null });
    try {
      const res = await exploreService.markExploreVideoWatched(
        exploreContentId,
        childId,
        completionPercentage
      );
      const data = res?.success ? res.data : null;
      const statusKey = `${childId}_${exploreContentId}`;
      const vw = data?.videoWatch as { watchCount?: number; video?: { _id?: string } } | undefined;
      const starsAwarded = !!(data?.starsAwarded ?? data?.starsJustAwarded);
      if (vw && data) {
        set((s) => ({
          watchStatusCache: {
            ...s.watchStatusCache,
            [statusKey]: {
              exploreContentId,
              videoId: typeof vw.video === 'object' && vw.video?._id ? String(vw.video._id) : '',
              currentWatchCount: vw.watchCount ?? 0,
              requiredWatchCount: data.requiredWatchCount ?? 1,
              starsAwarded: data.starsAwarded ?? false,
              starsAwardedAt: data.starsAwardedAt ?? null,
              starsToAward: data.starsToAward,
              isReplay: data.isReplay,
            } as ExploreWatchStatus,
          },
          loadingWatch: false,
          errorWatch: null,
          lastExploreStarsAwardedAt: starsAwarded ? Date.now() : s.lastExploreStarsAwardedAt,
        }));
      } else {
        set({ loadingWatch: false, errorWatch: null });
      }
      if (videoType) {
        const progressKey = `${childId}_${videoType}`;
        set((s) => {
          const nextProgress = { ...s.progressByVideoType };
          const nextStars = { ...s.totalStarsByVideoType };
          delete nextProgress[progressKey];
          delete nextStars[progressKey];
          return { progressByVideoType: nextProgress, totalStarsByVideoType: nextStars };
        });
      }
      if (starsAwarded && childId) {
        get().fetchChildTotalStars(childId);
      }
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ errorWatch: msg, loadingWatch: false });
      throw err;
    }
  },

  getExploreVideoWatchStatus: async (childId, exploreContentId) => {
    const key = `${childId}_${exploreContentId}`;
    const cached = get().watchStatusCache[key];
    if (cached !== undefined) return cached;
    try {
      const res = await exploreService.getExploreVideoWatchStatus(exploreContentId, childId);
      const status = res?.success && res.data ? res.data : null;
      if (status) {
        set((s) => ({
          watchStatusCache: { ...s.watchStatusCache, [key]: status },
          errorWatch: null,
        }));
      }
      return status;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ errorWatch: msg });
      throw err;
    }
  },

  getVideoTypeProgress: async (childId, videoType) => {
    const key = `${childId}_${videoType}`;
    const cached = get().progressByVideoType[key];
    if (cached !== undefined) return cached;
    try {
      const res = await exploreService.getVideoTypeProgress(videoType, childId);
      const data = res?.success && res.data ? res.data : null;
      const progress = data
        ? { totalVideos: data.totalVideos ?? 0, viewedVideos: data.viewedVideos ?? 0 }
        : { totalVideos: 0, viewedVideos: 0 };
      set((s) => ({
        progressByVideoType: { ...s.progressByVideoType, [key]: progress },
        errorWatch: null,
      }));
      return progress;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ errorWatch: msg });
      return { totalVideos: 0, viewedVideos: 0 };
    }
  },

  getTotalStarsForVideoType: async (childId, videoType) => {
    const key = `${childId}_${videoType}`;
    const cached = get().totalStarsByVideoType[key];
    if (cached !== undefined) return cached;
    try {
      const res = await exploreService.getTotalStarsForVideoType(videoType, childId);
      const data = res?.success && res.data ? res.data : null;
      const total = data?.totalStars ?? 0;
      set((s) => ({
        totalStarsByVideoType: { ...s.totalStarsByVideoType, [key]: total },
        errorWatch: null,
      }));
      return total;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ errorWatch: msg });
      return 0;
    }
  },

  clearErrorWatch: () => set({ errorWatch: null }),

  fetchChildTotalStars: async (childId) => {
    if (!childId) return 0;
    try {
      const res = await homeService.getChildProgress(childId);
      const total = res?.data?.totalStars ?? 0;
      set((s) => ({
        childTotalStars: { ...s.childTotalStars, [childId]: total },
      }));
      return total;
    } catch {
      return get().childTotalStars[childId] ?? 0;
    }
  },
}));
