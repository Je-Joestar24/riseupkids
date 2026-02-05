/**
 * Module Store
 *
 * Centralized state for the child module (course detail) screen.
 * - Holds course details with populated contents and progress
 * - Caches video watch and book reading status for the current child
 * - All API calls go through moduleService; store stays the single source of truth
 */

import { create } from 'zustand';

import { moduleService } from '@/services/moduleService';
import type {
  ModuleDetailsPayload,
  ContentType,
  VideoWatchStatus,
  BookReadingStatus,
  ApiResponse,
} from '@/services/moduleService';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface ModuleState {
  /** Full module details (course + contents + progress). Null when no module open. */
  details: ModuleDetailsPayload | null;
  /** Video watch status by video ID (normalized key = string). */
  videoWatchesByVideoId: Record<string, VideoWatchStatus>;
  /** Book reading status by book ID (normalized key = string). */
  bookReadingsByBookId: Record<string, BookReadingStatus>;
  /** Loading details (fetch module or refresh). */
  isLoading: boolean;
  /** Loading video/book sub-fetches (optional, for granular UI). */
  isLoadingVideoWatches: boolean;
  isLoadingBookReadings: boolean;
  /** Last error message. */
  error: string | null;
}

export interface ModuleActions {
  /** Fetch full module details for a course + child. Clears previous details. */
  fetchModuleDetails: (
    courseId: string,
    childId: string
  ) => Promise<ModuleDetailsPayload | null>;
  /** Refresh only video watches for child (e.g. after marking a video watched). */
  refreshVideoWatches: (childId: string) => Promise<void>;
  /** Refresh only book readings for child. */
  refreshBookReadings: (childId: string) => Promise<void>;
  /** Update content progress then refresh details so progress is up to date. */
  updateContentProgress: (
    courseId: string,
    childId: string,
    contentId: string,
    contentType: ContentType
  ) => Promise<boolean>;
  /** Mark course as completed then refresh details. */
  markCourseCompleted: (
    courseId: string,
    childId: string
  ) => Promise<boolean>;
  /** Mark video watched then refresh video watches. */
  markVideoWatched: (
    videoId: string,
    childId: string,
    completionPercentage?: number
  ) => Promise<ApiResponse<unknown> | null>;
  /** Clear module state (e.g. on leave). */
  clearModule: () => void;
  /** Clear error. */
  clearError: () => void;
}

const initialState: ModuleState = {
  details: null,
  videoWatchesByVideoId: {},
  bookReadingsByBookId: {},
  isLoading: false,
  isLoadingVideoWatches: false,
  isLoadingBookReadings: false,
  error: null,
};

function normalizeId(id: string | undefined): string {
  return id != null ? String(id) : '';
}

export const useModuleStore = create<ModuleState & ModuleActions>((set, get) => ({
  ...initialState,

  fetchModuleDetails: async (courseId, childId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await moduleService.getCourseDetailsForChild(courseId, childId);
      const details = res?.success ? res.data ?? null : null;
      set({
        details: details ?? null,
        isLoading: false,
        error: null,
      });
      if (details && childId) {
        get().refreshVideoWatches(childId).catch(() => {});
        get().refreshBookReadings(childId).catch(() => {});
      }
      return details ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoading: false });
      return null;
    }
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
      await get().fetchModuleDetails(courseId, childId);
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
      await get().fetchModuleDetails(courseId, childId);
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

  clearModule: () => set(initialState),
  clearError: () => set({ error: null }),
}));
