/**
 * Content Progress Store
 *
 * Unified Zustand store for chant, audio assignment, and video watch progress.
 * - Caches progress by content ID for fast UI updates
 * - All API calls go through dedicated services; store holds derived state
 * - Decoupled from module store; can be used standalone (e.g. modals, explore)
 *
 * Use with useContentProgress hook for a clean interface.
 */

import { create } from 'zustand';

import { chantService } from '@/services/chantService';
import type { ChantProgress } from '@/services/chantService';
import { audioAssignmentService } from '@/services/audioAssignmentService';
import type {
  AudioAssignmentProgress,
  SubmitAudioRecordingInput,
} from '@/services/audioAssignmentService';
import { videoWatchService } from '@/services/videoWatchService';
import type {
  VideoWatchStatus,
  MarkVideoWatchedResult,
} from '@/services/videoWatchService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeId(id: string | undefined): string {
  return id != null ? String(id) : '';
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface ContentProgressState {
  /** Chant progress by chantId */
  chantProgressByChantId: Record<string, ChantProgress>;
  /** Audio assignment progress by audioAssignmentId */
  audioProgressByAudioId: Record<string, AudioAssignmentProgress>;
  /** Video watch status by videoId */
  videoWatchesByVideoId: Record<string, VideoWatchStatus>;

  /** Loading flags per operation type */
  isLoadingChant: boolean;
  isLoadingAudio: boolean;
  isLoadingVideo: boolean;

  /** Last error message */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface ContentProgressActions {
  // ----- Chant -----
  startChant: (chantId: string, childId: string) => Promise<ChantProgress | null>;
  getChantProgress: (
    chantId: string,
    childId: string
  ) => Promise<ChantProgress | null>;
  completeChant: (
    chantId: string,
    childId: string,
    formData: FormData
  ) => Promise<ChantProgress | null>;
  /** Watch-only completion (JSON) — preferred for finish buttons without recording. */
  completeChantWatch: (
    chantId: string,
    childId: string,
    payload?: { timeSpent?: number; metadata?: Record<string, unknown> }
  ) => Promise<ChantProgress | null>;

  // ----- Audio Assignment -----
  startAudioAssignment: (
    audioAssignmentId: string,
    childId: string
  ) => Promise<AudioAssignmentProgress | null>;
  getAudioProgress: (
    audioAssignmentId: string,
    childId: string
  ) => Promise<AudioAssignmentProgress | null>;
  submitAudioAssignment: (
    audioAssignmentId: string,
    childId: string,
    input: SubmitAudioRecordingInput
  ) => Promise<AudioAssignmentProgress | null>;

  // ----- Video Watch -----
  markVideoWatched: (
    videoId: string,
    childId: string,
    completionPercentage?: number
  ) => Promise<MarkVideoWatchedResult | null>;
  getVideoWatchStatus: (
    videoId: string,
    childId: string
  ) => Promise<VideoWatchStatus | null>;
  refreshVideoWatches: (childId: string) => Promise<void>;

  // ----- Common -----
  clearContentProgress: () => void;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState: ContentProgressState = {
  chantProgressByChantId: {},
  audioProgressByAudioId: {},
  videoWatchesByVideoId: {},
  isLoadingChant: false,
  isLoadingAudio: false,
  isLoadingVideo: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useContentProgressStore = create<
  ContentProgressState & ContentProgressActions
>((set, get) => ({
  ...initialState,

  startChant: async (chantId, childId) => {
    set({ isLoadingChant: true, error: null });
    try {
      const res = await chantService.start(chantId, childId);
      const progress = res?.success ? res.data ?? null : null;
      if (progress) {
        const key = normalizeId(chantId);
        set((s) => ({
          chantProgressByChantId: { ...s.chantProgressByChantId, [key]: progress },
          isLoadingChant: false,
          error: null,
        }));
      } else {
        set({
          isLoadingChant: false,
          error: res?.message ?? 'Failed to start chant',
        });
      }
      return progress ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoadingChant: false, error: msg });
      return null;
    }
  },

  getChantProgress: async (chantId, childId) => {
    set({ isLoadingChant: true, error: null });
    try {
      const res = await chantService.getProgress(chantId, childId);
      const progress = res?.success ? res.data ?? null : null;
      if (progress) {
        const key = normalizeId(chantId);
        set((s) => ({
          chantProgressByChantId: { ...s.chantProgressByChantId, [key]: progress },
          isLoadingChant: false,
          error: null,
        }));
      } else {
        set({
          isLoadingChant: false,
          error: res?.message ?? 'Failed to get chant progress',
        });
      }
      return progress ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoadingChant: false, error: msg });
      return null;
    }
  },

  completeChant: async (chantId, childId, formData) => {
    set({ isLoadingChant: true, error: null });
    try {
      const res = await chantService.complete(chantId, childId, formData);
      const progress = res?.success ? res.data ?? null : null;
      if (progress) {
        const key = normalizeId(chantId);
        set((s) => ({
          chantProgressByChantId: { ...s.chantProgressByChantId, [key]: progress },
          isLoadingChant: false,
          error: null,
        }));
      } else {
        set({
          isLoadingChant: false,
          error: res?.message ?? 'Failed to complete chant',
        });
      }
      return progress ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoadingChant: false, error: msg });
      throw err instanceof Error ? err : new Error(msg);
    }
  },

  completeChantWatch: async (chantId, childId, payload = {}) => {
    set({ isLoadingChant: true, error: null });
    try {
      const res = await chantService.completeWatch(chantId, childId, payload);
      const progress = res?.success ? res.data ?? null : null;
      if (progress) {
        const key = normalizeId(chantId);
        set((s) => ({
          chantProgressByChantId: { ...s.chantProgressByChantId, [key]: progress },
          isLoadingChant: false,
          error: null,
        }));
      } else {
        set({
          isLoadingChant: false,
          error: res?.message ?? 'Failed to complete chant',
        });
      }
      return progress ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoadingChant: false, error: msg });
      throw err instanceof Error ? err : new Error(msg);
    }
  },

  startAudioAssignment: async (audioAssignmentId, childId) => {
    set({ isLoadingAudio: true, error: null });
    try {
      const res = await audioAssignmentService.start(audioAssignmentId, childId);
      const progress = res?.success ? res.data ?? null : null;
      if (progress) {
        const key = normalizeId(audioAssignmentId);
        set((s) => ({
          audioProgressByAudioId: { ...s.audioProgressByAudioId, [key]: progress },
          isLoadingAudio: false,
          error: null,
        }));
      } else {
        set({
          isLoadingAudio: false,
          error: res?.message ?? 'Failed to start audio assignment',
        });
      }
      return progress ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoadingAudio: false, error: msg });
      return null;
    }
  },

  getAudioProgress: async (audioAssignmentId, childId) => {
    set({ isLoadingAudio: true, error: null });
    try {
      const res = await audioAssignmentService.getProgress(
        audioAssignmentId,
        childId
      );
      const progress = res?.success ? res.data ?? null : null;
      if (progress) {
        const key = normalizeId(audioAssignmentId);
        set((s) => ({
          audioProgressByAudioId: { ...s.audioProgressByAudioId, [key]: progress },
          isLoadingAudio: false,
          error: null,
        }));
      } else {
        set({
          isLoadingAudio: false,
          error: res?.message ?? 'Failed to get audio progress',
        });
      }
      return progress ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoadingAudio: false, error: msg });
      return null;
    }
  },

  submitAudioAssignment: async (audioAssignmentId, childId, input) => {
    set({ isLoadingAudio: true, error: null });
    try {
      const res = await audioAssignmentService.submit(
        audioAssignmentId,
        childId,
        input
      );
      const progress = res?.success ? res.data ?? null : null;
      if (progress) {
        const key = normalizeId(audioAssignmentId);
        set((s) => ({
          audioProgressByAudioId: { ...s.audioProgressByAudioId, [key]: progress },
          isLoadingAudio: false,
          error: null,
        }));
        return progress;
      }

      const message = res?.message ?? 'Failed to submit audio assignment';
      set({ isLoadingAudio: false, error: message });
      throw new Error(message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoadingAudio: false, error: msg });
      throw err instanceof Error ? err : new Error(msg);
    }
  },

  markVideoWatched: async (videoId, childId, completionPercentage = 100) => {
    set({ isLoadingVideo: true, error: null });
    try {
      const res = await videoWatchService.markVideoWatched(
        videoId,
        childId,
        completionPercentage
      );
      const result = res?.success ? (res.data as MarkVideoWatchedResult) ?? null : null;
      if (result?.videoWatch) {
        const key = normalizeId(videoId);
        set((s) => ({
          videoWatchesByVideoId: {
            ...s.videoWatchesByVideoId,
            [key]: result.videoWatch,
          },
          isLoadingVideo: false,
          error: null,
        }));
      } else {
        set({
          isLoadingVideo: false,
          error: res?.message ?? 'Failed to record video watch',
        });
      }
      return result ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ isLoadingVideo: false, error: msg });
      return null;
    }
  },

  getVideoWatchStatus: async (videoId, childId) => {
    try {
      const res = await videoWatchService.getVideoWatchStatus(videoId, childId);
      const status = res?.success ? res.data ?? null : null;
      if (status) {
        const key = normalizeId(videoId);
        set((s) => ({
          videoWatchesByVideoId: {
            ...s.videoWatchesByVideoId,
            [key]: status,
          },
        }));
      }
      return status ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg });
      return null;
    }
  },

  refreshVideoWatches: async (childId) => {
    set({ isLoadingVideo: true });
    try {
      const res = await videoWatchService.getChildVideoWatches(childId);
      const list = res?.success && Array.isArray(res.data) ? res.data : [];
      const byId: Record<string, VideoWatchStatus> = {};
      list.forEach((w) => {
        const id = (w as { videoId?: string }).videoId;
        if (id) byId[normalizeId(id)] = w as VideoWatchStatus;
      });
      set({ videoWatchesByVideoId: byId, isLoadingVideo: false });
    } catch {
      set({ isLoadingVideo: false });
    }
  },

  clearContentProgress: () => set(initialState),
  clearError: () => set({ error: null }),
}));
