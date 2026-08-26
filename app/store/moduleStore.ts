/**
 * Module Store
 *
 * Session cache for the child module (course detail) screen.
 * Stale-while-revalidate: a cached course paints immediately; refresh does
 * not flash the skeleton. Inflight requests are deduped so journey-card
 * prefetch and the module screen share one network call.
 */

import { Image } from 'react-native';
import { create } from 'zustand';

import { getCoverImageUrl } from '@/components/child/module/module-utils';
import { moduleService } from '@/services/moduleService';
import type {
  ModuleDetailsPayload,
  ContentType,
  VideoWatchStatus,
  BookReadingStatus,
  ApiResponse,
} from '@/services/moduleService';
import { isJourneyModuleLocked } from '@/utils/journeyModuleAccess';
import {
  moduleCacheKey,
  shouldShowModuleLoading,
} from '@/utils/moduleCache';

export interface FetchModuleDetailsOptions {
  silent?: boolean;
  force?: boolean;
}

const inflightByKey = new Map<string, Promise<ModuleDetailsPayload | null>>();

const LOCKED_MODULE_MESSAGE =
  'This course is locked. Complete previous courses first.';

function normalizeId(id: string | undefined): string {
  return id != null ? String(id) : '';
}

function prefetchModuleCover(details: ModuleDetailsPayload | null): void {
  const course = details?.course;
  if (!course) return;
  const url = getCoverImageUrl(course.coverImage ?? course.coverImagePath ?? null);
  if (url) {
    void Image.prefetch(url).catch(() => undefined);
  }
}

function isLockedDetails(details: ModuleDetailsPayload): boolean {
  return isJourneyModuleLocked({
    status: details.status ?? details.progress?.status,
    accessible: details.accessible,
    accessOverride: details.accessOverride,
    accessReason: details.accessReason,
  });
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface ModuleState {
  /** Details currently shown (may lag the route by one paint). */
  details: ModuleDetailsPayload | null;
  /** Cached details keyed by childId:courseId. */
  detailsByKey: Record<string, ModuleDetailsPayload>;
  /** Last fetch target; used so stale responses do not overwrite a newer course. */
  activeKey: string | null;
  /** Video watch status by video ID (normalized key = string). */
  videoWatchesByVideoId: Record<string, VideoWatchStatus>;
  /** Book reading status by book ID (normalized key = string). */
  bookReadingsByBookId: Record<string, BookReadingStatus>;
  isLoading: boolean;
  isLoadingVideoWatches: boolean;
  isLoadingBookReadings: boolean;
  error: string | null;
}

export interface ModuleActions {
  fetchModuleDetails: (
    courseId: string,
    childId: string,
    options?: FetchModuleDetailsOptions
  ) => Promise<ModuleDetailsPayload | null>;
  prefetchModuleDetails: (courseId: string, childId: string) => void;
  refreshVideoWatches: (childId: string) => Promise<void>;
  refreshBookReadings: (childId: string) => Promise<void>;
  updateContentProgress: (
    courseId: string,
    childId: string,
    contentId: string,
    contentType: ContentType
  ) => Promise<boolean>;
  markCourseCompleted: (
    courseId: string,
    childId: string
  ) => Promise<boolean>;
  markVideoWatched: (
    videoId: string,
    childId: string,
    completionPercentage?: number
  ) => Promise<ApiResponse<unknown> | null>;
  /** Clear the on-screen module without dropping the session cache. */
  clearModule: () => void;
  clearError: () => void;
}

const initialState: ModuleState = {
  details: null,
  detailsByKey: {},
  activeKey: null,
  videoWatchesByVideoId: {},
  bookReadingsByBookId: {},
  isLoading: false,
  isLoadingVideoWatches: false,
  isLoadingBookReadings: false,
  error: null,
};

export const useModuleStore = create<ModuleState & ModuleActions>((set, get) => ({
  ...initialState,

  fetchModuleDetails: async (courseId, childId, options = {}) => {
    if (!courseId || !childId) return null;

    const key = moduleCacheKey(childId, courseId);
    const existingInflight = inflightByKey.get(key);
    if (existingInflight && !options.force) {
      return existingInflight;
    }
    if (existingInflight && options.force) {
      try {
        await existingInflight;
      } catch {
        // continue with a fresh request after the in-flight one settles
      }
    }

    const cached = get().detailsByKey[key];
    const showLoading = shouldShowModuleLoading(Boolean(cached), {
      silent: options.silent,
    });

    set({
      activeKey: key,
      details: cached ?? null,
      isLoading: showLoading,
      error: null,
    });

    const request = (async () => {
      try {
        const res = await moduleService.getCourseDetailsForChild(courseId, childId);
        const details = res?.success ? res.data ?? null : null;

        if (details && isLockedDetails(details)) {
          set((s) => {
            const nextCache = { ...s.detailsByKey };
            delete nextCache[key];
            const viewingThis = s.activeKey === key;
            return {
              detailsByKey: nextCache,
              details: viewingThis ? null : s.details,
              isLoading: viewingThis ? false : s.isLoading,
              error: viewingThis ? LOCKED_MODULE_MESSAGE : s.error,
            };
          });
          return null;
        }

        set((s) => {
          const viewingThis = s.activeKey === key;
          return {
            detailsByKey: details
              ? { ...s.detailsByKey, [key]: details }
              : s.detailsByKey,
            details: viewingThis ? details ?? null : s.details,
            isLoading: viewingThis ? false : s.isLoading,
            error: viewingThis ? null : s.error,
          };
        });

        if (details) {
          prefetchModuleCover(details);
          if (childId && get().activeKey === key) {
            get().refreshVideoWatches(childId).catch(() => undefined);
            get().refreshBookReadings(childId).catch(() => undefined);
          }
        }
        return details ?? null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set((s) => {
          const viewingThis = s.activeKey === key;
          return {
            error: viewingThis ? msg : s.error,
            isLoading: viewingThis ? false : s.isLoading,
          };
        });
        return get().detailsByKey[key] ?? null;
      } finally {
        inflightByKey.delete(key);
      }
    })();

    inflightByKey.set(key, request);
    return request;
  },

  prefetchModuleDetails: (courseId, childId) => {
    if (!courseId || !childId) return;
    const key = moduleCacheKey(childId, courseId);
    if (inflightByKey.has(key)) return;
    void get().fetchModuleDetails(courseId, childId);
  },

  refreshVideoWatches: async (childId) => {
    set({ isLoadingVideoWatches: true });
    try {
      const res = await moduleService.getChildVideoWatches(childId);
      const list = res?.success && Array.isArray(res.data) ? res.data : [];
      const byId: Record<string, VideoWatchStatus> = {};
      list.forEach((w) => {
        const id = (w as { videoId?: string }).videoId;
        if (id) byId[normalizeId(id)] = w as VideoWatchStatus;
      });
      set({ videoWatchesByVideoId: byId, isLoadingVideoWatches: false });
    } catch {
      set({ isLoadingVideoWatches: false });
    }
  },

  refreshBookReadings: async (childId) => {
    set({ isLoadingBookReadings: true });
    try {
      const res = await moduleService.getChildBookReadings(childId);
      const list = res?.success && Array.isArray(res.data) ? res.data : [];
      const byId: Record<string, BookReadingStatus> = {};
      list.forEach((r) => {
        const id = (r as { bookId?: string }).bookId;
        if (id) byId[normalizeId(id)] = r as BookReadingStatus;
      });
      set({ bookReadingsByBookId: byId, isLoadingBookReadings: false });
    } catch {
      set({ isLoadingBookReadings: false });
    }
  },

  updateContentProgress: async (
    courseId,
    childId,
    contentId,
    contentType
  ) => {
    try {
      await moduleService.updateContentProgress(
        courseId,
        childId,
        contentId,
        contentType
      );
      await get().fetchModuleDetails(courseId, childId, {
        silent: true,
        force: true,
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      return false;
    }
  },

  markCourseCompleted: async (courseId, childId) => {
    try {
      await moduleService.markCourseCompleted(courseId, childId);
      await get().fetchModuleDetails(courseId, childId, {
        silent: true,
        force: true,
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      return false;
    }
  },

  markVideoWatched: async (videoId, childId, completionPercentage = 100) => {
    try {
      const res = await moduleService.markVideoWatched(
        videoId,
        childId,
        completionPercentage
      );
      await get().refreshVideoWatches(childId);
      return res ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      return null;
    }
  },

  clearModule: () =>
    set({
      details: null,
      activeKey: null,
      isLoading: false,
      error: null,
    }),
  clearError: () => set({ error: null }),
}));
