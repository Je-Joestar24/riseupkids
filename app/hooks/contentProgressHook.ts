/**
 * useContentProgress Hook
 *
 * Unified hook for chant, audio assignment, and video watch progress.
 * - Subscribes to contentProgressStore
 * - Provides actions with childId scoping
 * - Helpers for progress lookups and completion checks
 *
 * Use in modals (ChantRecordingModal, AudioAssignmentRecordingModal, VideoPlayerModal)
 * and any screen that needs content progress without full module context.
 */

import { useCallback, useMemo } from 'react';

import { useContentProgressStore } from '@/store/contentProgressStore';
import { moduleService } from '@/services/moduleService';
import type { ContentType } from '@/services/moduleService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeId(id: string | undefined): string {
  return id != null ? String(id) : '';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseContentProgressOptions {
  /** Child ID - required for all progress operations */
  childId: string | null;
  /** Optional course ID - used to update course progress when content completes */
  courseId?: string | null;
}

export interface UseContentProgressReturn {
  // ----- State -----
  chantProgressByChantId: Record<string, unknown>;
  audioProgressByAudioId: Record<string, unknown>;
  videoWatchesByVideoId: Record<string, unknown>;
  isLoadingChant: boolean;
  isLoadingAudio: boolean;
  isLoadingVideo: boolean;
  error: string | null;

  // ----- Chant -----
  startChant: (chantId: string) => Promise<unknown>;
  getChantProgress: (chantId: string) => Promise<unknown>;
  completeChant: (chantId: string, formData: FormData) => Promise<unknown>;
  getChantProgressCached: (chantId: string) => unknown;

  // ----- Audio Assignment -----
  startAudioAssignment: (audioAssignmentId: string) => Promise<unknown>;
  getAudioProgress: (audioAssignmentId: string) => Promise<unknown>;
  submitAudioAssignment: (
    audioAssignmentId: string,
    formData: FormData
  ) => Promise<unknown>;
  getAudioProgressCached: (audioAssignmentId: string) => unknown;

  // ----- Video Watch -----
  markVideoWatched: (
    videoId: string,
    completionPercentage?: number
  ) => Promise<unknown>;
  getVideoWatchStatus: (videoId: string) => Promise<unknown>;
  refreshVideoWatches: () => Promise<void>;
  getVideoWatchStatusCached: (videoId: string) => unknown;

  // ----- Course progress (optional) -----
  updateCourseContentProgress: (
    contentId: string,
    contentType: ContentType
  ) => Promise<boolean>;

  // ----- Common -----
  clearContentProgress: () => void;
  clearError: () => void;
}

export function useContentProgress({
  childId,
  courseId,
}: UseContentProgressOptions): UseContentProgressReturn {
  const chantProgressByChantId = useContentProgressStore(
    (s) => s.chantProgressByChantId
  );
  const audioProgressByAudioId = useContentProgressStore(
    (s) => s.audioProgressByAudioId
  );
  const videoWatchesByVideoId = useContentProgressStore(
    (s) => s.videoWatchesByVideoId
  );
  const isLoadingChant = useContentProgressStore((s) => s.isLoadingChant);
  const isLoadingAudio = useContentProgressStore((s) => s.isLoadingAudio);
  const isLoadingVideo = useContentProgressStore((s) => s.isLoadingVideo);
  const error = useContentProgressStore((s) => s.error);

  const startChantAction = useContentProgressStore((s) => s.startChant);
  const getChantProgressAction = useContentProgressStore((s) => s.getChantProgress);
  const completeChantAction = useContentProgressStore((s) => s.completeChant);

  const startAudioAction = useContentProgressStore(
    (s) => s.startAudioAssignment
  );
  const getAudioProgressAction = useContentProgressStore(
    (s) => s.getAudioProgress
  );
  const submitAudioAction = useContentProgressStore(
    (s) => s.submitAudioAssignment
  );

  const markVideoWatchedAction = useContentProgressStore(
    (s) => s.markVideoWatched
  );
  const getVideoWatchStatusAction = useContentProgressStore(
    (s) => s.getVideoWatchStatus
  );
  const refreshVideoWatchesAction = useContentProgressStore(
    (s) => s.refreshVideoWatches
  );

  const clearContentProgress = useContentProgressStore(
    (s) => s.clearContentProgress
  );
  const clearError = useContentProgressStore((s) => s.clearError);

  const startChant = useCallback(
    (chantId: string) => {
      if (!childId) return Promise.resolve(null);
      return startChantAction(chantId, childId);
    },
    [childId, startChantAction]
  );

  const getChantProgress = useCallback(
    (chantId: string) => {
      if (!childId) return Promise.resolve(null);
      return getChantProgressAction(chantId, childId);
    },
    [childId, getChantProgressAction]
  );

  const completeChant = useCallback(
    (chantId: string, formData: FormData) => {
      if (!childId) return Promise.resolve(null);
      return completeChantAction(chantId, childId, formData);
    },
    [childId, completeChantAction]
  );

  const getChantProgressCached = useCallback(
    (chantId: string) => {
      const key = normalizeId(chantId);
      return chantProgressByChantId[key] ?? null;
    },
    [chantProgressByChantId]
  );

  const startAudioAssignment = useCallback(
    (audioAssignmentId: string) => {
      if (!childId) return Promise.resolve(null);
      return startAudioAction(audioAssignmentId, childId);
    },
    [childId, startAudioAction]
  );

  const getAudioProgress = useCallback(
    (audioAssignmentId: string) => {
      if (!childId) return Promise.resolve(null);
      return getAudioProgressAction(audioAssignmentId, childId);
    },
    [childId, getAudioProgressAction]
  );

  const submitAudioAssignment = useCallback(
    (audioAssignmentId: string, formData: FormData) => {
      if (!childId) return Promise.resolve(null);
      return submitAudioAction(audioAssignmentId, childId, formData);
    },
    [childId, submitAudioAction]
  );

  const getAudioProgressCached = useCallback(
    (audioAssignmentId: string) => {
      const key = normalizeId(audioAssignmentId);
      return audioProgressByAudioId[key] ?? null;
    },
    [audioProgressByAudioId]
  );

  const markVideoWatched = useCallback(
    (videoId: string, completionPercentage?: number) => {
      if (!childId) return Promise.resolve(null);
      return markVideoWatchedAction(videoId, childId, completionPercentage);
    },
    [childId, markVideoWatchedAction]
  );

  const getVideoWatchStatus = useCallback(
    (videoId: string) => {
      if (!childId) return Promise.resolve(null);
      return getVideoWatchStatusAction(videoId, childId);
    },
    [childId, getVideoWatchStatusAction]
  );

  const refreshVideoWatches = useCallback(() => {
    if (!childId) return Promise.resolve();
    return refreshVideoWatchesAction(childId);
  }, [childId, refreshVideoWatchesAction]);

  const getVideoWatchStatusCached = useCallback(
    (videoId: string) => {
      const key = normalizeId(videoId);
      return videoWatchesByVideoId[key] ?? null;
    },
    [videoWatchesByVideoId]
  );

  const updateCourseContentProgress = useCallback(
    async (contentId: string, contentType: ContentType): Promise<boolean> => {
      if (!childId || !courseId) return false;
      try {
        await moduleService.updateContentProgress(
          courseId,
          childId,
          contentId,
          contentType
        );
        return true;
      } catch {
        return false;
      }
    },
    [childId, courseId]
  );

  return useMemo(
    () => ({
      chantProgressByChantId,
      audioProgressByAudioId,
      videoWatchesByVideoId,
      isLoadingChant,
      isLoadingAudio,
      isLoadingVideo,
      error,
      startChant,
      getChantProgress,
      completeChant,
      getChantProgressCached,
      startAudioAssignment,
      getAudioProgress,
      submitAudioAssignment,
      getAudioProgressCached,
      markVideoWatched,
      getVideoWatchStatus,
      refreshVideoWatches,
      getVideoWatchStatusCached,
      updateCourseContentProgress,
      clearContentProgress,
      clearError,
    }),
    [
      chantProgressByChantId,
      audioProgressByAudioId,
      videoWatchesByVideoId,
      isLoadingChant,
      isLoadingAudio,
      isLoadingVideo,
      error,
      startChant,
      getChantProgress,
      completeChant,
      getChantProgressCached,
      startAudioAssignment,
      getAudioProgress,
      submitAudioAssignment,
      getAudioProgressCached,
      markVideoWatched,
      getVideoWatchStatus,
      refreshVideoWatches,
      getVideoWatchStatusCached,
      updateCourseContentProgress,
      clearContentProgress,
      clearError,
    ]
  );
}
