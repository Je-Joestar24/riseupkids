/**
 * useModule Hook
 *
 * Single entry point for the child module (course detail) screen.
 * - Subscribes to module store (details, video/book caches, loading, error)
 * - Exposes derived data: videos, books, chants, audioAssignments, activities, progress summary
 * - Exposes actions: fetchModuleDetails, refresh, updateContentProgress, markVideoWatched, etc.
 * - Reusable: components can use useModule() or useModuleStore() for fine-grained subscriptions
 */

import { useCallback, useMemo } from 'react';

import { useModuleStore } from '@/store/moduleStore';
import type { FetchModuleDetailsOptions } from '@/store/moduleStore';
import type {
  PopulatedContentItem,
  ContentType,
  CourseWithContents,
  CourseProgressDoc,
} from '@/services/moduleService';
import { CONTENT_TYPES } from '@/services/moduleService';
import { pickModuleDetailsForCourse } from '@/utils/moduleCache';

// ---------------------------------------------------------------------------
// Helpers: filter contents by type
// ---------------------------------------------------------------------------

function filterContents(
  contents: PopulatedContentItem[] | undefined,
  contentType: ContentType
): PopulatedContentItem[] {
  if (!Array.isArray(contents)) return [];
  return contents.filter((c) => c._contentType === contentType);
}

function getContentId(item: PopulatedContentItem): string {
  return String(item._contentId ?? item._id ?? '');
}

// ---------------------------------------------------------------------------
// Progress summary from contentProgress
// ---------------------------------------------------------------------------

export interface ModuleProgressSummary {
  completedCount: number;
  todoCount: number;
  lockedCount: number;
  totalCount: number;
  progressPercentage: number;
}

function deriveProgressSummary(
  contentProgress:
    | Array<{ contentId?: string; contentType?: string; status: string }>
    | undefined,
  contents: PopulatedContentItem[]
): ModuleProgressSummary {
  const totalContentCount = contents.length;
  const list = contentProgress ?? [];

  const completedItems = new Set(
    list
      .filter((p) => p.status === 'completed')
      .map((p) => `${String(p.contentId)}-${p.contentType}`)
  );

  const completedCount = contents.filter((content) => {
    const contentId = getContentId(content);
    const contentType = content._contentType;
    if (!contentId || !contentType) return false;
    return completedItems.has(`${contentId}-${contentType}`);
  }).length;

  const todoCount = Math.max(0, totalContentCount - completedCount);
  return {
    completedCount,
    todoCount,
    lockedCount: 0,
    totalCount: totalContentCount,
    progressPercentage:
      totalContentCount > 0
        ? Math.round((completedCount / totalContentCount) * 100)
        : 0,
  };
}

// ---------------------------------------------------------------------------
// Video progress (circles 0–5) from videoWatchesByVideoId
// ---------------------------------------------------------------------------

export function getVideoProgressCircles(
  videoWatchesByVideoId: Record<string, { currentWatchCount?: number }>,
  video: PopulatedContentItem
): number {
  const id = getContentId(video);
  const status = videoWatchesByVideoId[id];
  const current = status?.currentWatchCount ?? 0;
  return Math.min(current, 5);
}

export function isVideoCompleted(
  videoWatchesByVideoId: Record<string, { currentWatchCount?: number; requiredWatchCount?: number; starsAwarded?: boolean }>,
  video: PopulatedContentItem
): boolean {
  const id = getContentId(video);
  const status = videoWatchesByVideoId[id];
  if (!status) return false;
  const required = status.requiredWatchCount ?? 5;
  if ((status.currentWatchCount ?? 0) >= required) return true;
  return Boolean(status.starsAwarded);
}

// ---------------------------------------------------------------------------
// Book progress (circles 0–5) from bookReadingsByBookId
// ---------------------------------------------------------------------------

export function getBookProgressCircles(
  bookReadingsByBookId: Record<string, { currentReadingCount?: number }>,
  book: PopulatedContentItem
): number {
  const id = getContentId(book);
  const status = bookReadingsByBookId[id];
  const current = status?.currentReadingCount ?? 0;
  return Math.min(current, 5);
}

export function isBookCompleted(
  bookReadingsByBookId: Record<string, { currentReadingCount?: number; requiredReadingCount?: number; starsAwarded?: boolean }>,
  book: PopulatedContentItem
): boolean {
  const id = getContentId(book);
  const status = bookReadingsByBookId[id];
  if (!status) return false;
  const required = status.requiredReadingCount ?? 5;
  if ((status.currentReadingCount ?? 0) >= required) return true;
  return Boolean(status.starsAwarded);
}

// ---------------------------------------------------------------------------
// Chant progress from contentProgress (completed = 5 circles)
// ---------------------------------------------------------------------------

export function getChantProgressCircles(
  contentProgress: Array<{ contentId: string; contentType: string; status: string }> | undefined,
  chant: PopulatedContentItem
): number {
  const id = getContentId(chant);
  const found = contentProgress?.find(
    (p) => String(p.contentId) === id && p.contentType === CONTENT_TYPES.CHANT
  );
  return found?.status === 'completed' ? 5 : 0;
}

export function isChantCompleted(
  contentProgress: Array<{ contentId: string; contentType: string; status: string }> | undefined,
  chant: PopulatedContentItem
): boolean {
  const id = getContentId(chant);
  const found = contentProgress?.find(
    (p) => String(p.contentId) === id && p.contentType === CONTENT_TYPES.CHANT
  );
  return found?.status === 'completed';
}

// ---------------------------------------------------------------------------
// Audio status from contentProgress
// ---------------------------------------------------------------------------

export function getAudioStatus(
  contentProgress: Array<{ contentId: string; contentType: string; status: string }> | undefined,
  audio: PopulatedContentItem
): 'not_started' | 'in_progress' | 'completed' | null {
  const id = getContentId(audio);
  const found = contentProgress?.find(
    (p) =>
      String(p.contentId) === id &&
      p.contentType === CONTENT_TYPES.AUDIO_ASSIGNMENT
  );
  return (found?.status as 'not_started' | 'in_progress' | 'completed') ?? null;
}

// ---------------------------------------------------------------------------
// useModule hook
// ---------------------------------------------------------------------------

export interface UseModuleReturn {
  // Data
  details: ReturnType<typeof useModuleStore.getState>['details'];
  course: CourseWithContents | null;
  progress: CourseProgressDoc | null;
  contents: PopulatedContentItem[];
  videos: PopulatedContentItem[];
  books: PopulatedContentItem[];
  chants: PopulatedContentItem[];
  audioAssignments: PopulatedContentItem[];
  activities: PopulatedContentItem[];
  progressSummary: ModuleProgressSummary;
  videoWatchesByVideoId: Record<string, unknown>;
  bookReadingsByBookId: Record<string, unknown>;
  // Loading & error
  isLoading: boolean;
  isLoadingVideoWatches: boolean;
  isLoadingBookReadings: boolean;
  error: string | null;
  // Actions
  fetchModuleDetails: (
    courseId: string,
    childId: string,
    options?: FetchModuleDetailsOptions
  ) => Promise<unknown>;
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
  ) => Promise<unknown>;
  clearModule: () => void;
  clearError: () => void;
  // Helpers (reusable in components)
  getVideoProgressCircles: (video: PopulatedContentItem) => number;
  isVideoCompleted: (video: PopulatedContentItem) => boolean;
  getBookProgressCircles: (book: PopulatedContentItem) => number;
  isBookCompleted: (book: PopulatedContentItem) => boolean;
  getChantProgressCircles: (chant: PopulatedContentItem) => number;
  isChantCompleted: (chant: PopulatedContentItem) => boolean;
  getAudioStatus: (
    audio: PopulatedContentItem
  ) => 'not_started' | 'in_progress' | 'completed' | null;
}

/** Stable empty list so Zustand-derived contents do not allocate a new [] every render. */
const EMPTY_CONTENTS: PopulatedContentItem[] = [];

export function useModule(
  childId?: string | null,
  courseId?: string | null
): UseModuleReturn {
  const details = useModuleStore((s) =>
    pickModuleDetailsForCourse(s.details, s.detailsByKey, childId, courseId)
  );
  const videoWatchesByVideoId = useModuleStore((s) => s.videoWatchesByVideoId);
  const bookReadingsByBookId = useModuleStore((s) => s.bookReadingsByBookId);
  const isLoading = useModuleStore((s) => s.isLoading);
  const isLoadingVideoWatches = useModuleStore((s) => s.isLoadingVideoWatches);
  const isLoadingBookReadings = useModuleStore((s) => s.isLoadingBookReadings);
  const error = useModuleStore((s) => s.error);

  const fetchModuleDetails = useModuleStore((s) => s.fetchModuleDetails);
  const refreshVideoWatches = useModuleStore((s) => s.refreshVideoWatches);
  const refreshBookReadings = useModuleStore((s) => s.refreshBookReadings);
  const updateContentProgress = useModuleStore((s) => s.updateContentProgress);
  const markCourseCompleted = useModuleStore((s) => s.markCourseCompleted);
  const markVideoWatched = useModuleStore((s) => s.markVideoWatched);
  const clearModule = useModuleStore((s) => s.clearModule);
  const clearError = useModuleStore((s) => s.clearError);

  const course = details?.course ?? null;
  const progress = details?.progress ?? null;
  const contents = useMemo(
    () => course?.contents ?? EMPTY_CONTENTS,
    [course?.contents]
  );

  const videos = useMemo(
    () => filterContents(contents, CONTENT_TYPES.VIDEO as ContentType),
    [contents]
  );
  const books = useMemo(
    () => filterContents(contents, CONTENT_TYPES.BOOK as ContentType),
    [contents]
  );
  const chants = useMemo(
    () => filterContents(contents, CONTENT_TYPES.CHANT as ContentType),
    [contents]
  );
  const audioAssignments = useMemo(
    () =>
      filterContents(contents, CONTENT_TYPES.AUDIO_ASSIGNMENT as ContentType),
    [contents]
  );
  const activities = useMemo(
    () => filterContents(contents, CONTENT_TYPES.ACTIVITY as ContentType),
    [contents]
  );

  const progressSummary = useMemo((): ModuleProgressSummary => {
    const serverSummary = (
      details as { progressSummary?: ModuleProgressSummary } | null
    )?.progressSummary;
    if (
      serverSummary &&
      typeof serverSummary.completedCount === 'number' &&
      typeof serverSummary.totalCount === 'number'
    ) {
      return {
        completedCount: serverSummary.completedCount,
        todoCount:
          typeof serverSummary.todoCount === 'number'
            ? serverSummary.todoCount
            : Math.max(0, serverSummary.totalCount - serverSummary.completedCount),
        lockedCount: serverSummary.lockedCount ?? 0,
        totalCount: serverSummary.totalCount,
        progressPercentage:
          typeof serverSummary.progressPercentage === 'number'
            ? serverSummary.progressPercentage
            : serverSummary.totalCount > 0
              ? Math.round(
                  (serverSummary.completedCount / serverSummary.totalCount) * 100
                )
              : 0,
      };
    }
    return deriveProgressSummary(progress?.contentProgress, contents);
  }, [details, progress?.contentProgress, contents]);

  const getVideoProgressCirclesFor = useCallback(
    (video: PopulatedContentItem) =>
      getVideoProgressCircles(videoWatchesByVideoId, video),
    [videoWatchesByVideoId]
  );
  const isVideoCompletedFor = useCallback(
    (video: PopulatedContentItem) =>
      isVideoCompleted(videoWatchesByVideoId, video),
    [videoWatchesByVideoId]
  );
  const getBookProgressCirclesFor = useCallback(
    (book: PopulatedContentItem) =>
      getBookProgressCircles(bookReadingsByBookId, book),
    [bookReadingsByBookId]
  );
  const isBookCompletedFor = useCallback(
    (book: PopulatedContentItem) =>
      isBookCompleted(bookReadingsByBookId, book),
    [bookReadingsByBookId]
  );
  const getChantProgressCirclesFor = useCallback(
    (chant: PopulatedContentItem) =>
      getChantProgressCircles(progress?.contentProgress, chant),
    [progress?.contentProgress]
  );
  const isChantCompletedFor = useCallback(
    (chant: PopulatedContentItem) =>
      isChantCompleted(progress?.contentProgress, chant),
    [progress?.contentProgress]
  );
  const getAudioStatusFor = useCallback(
    (audio: PopulatedContentItem) =>
      getAudioStatus(progress?.contentProgress, audio),
    [progress?.contentProgress]
  );

  return useMemo(
    () => ({
      details,
      course,
      progress,
      contents,
      videos,
      books,
      chants,
      audioAssignments,
      activities,
      progressSummary,
      videoWatchesByVideoId,
      bookReadingsByBookId,
      isLoading,
      isLoadingVideoWatches,
      isLoadingBookReadings,
      error,
      fetchModuleDetails,
      refreshVideoWatches,
      refreshBookReadings,
      updateContentProgress,
      markCourseCompleted,
      markVideoWatched,
      clearModule,
      clearError,
      getVideoProgressCircles: getVideoProgressCirclesFor,
      isVideoCompleted: isVideoCompletedFor,
      getBookProgressCircles: getBookProgressCirclesFor,
      isBookCompleted: isBookCompletedFor,
      getChantProgressCircles: getChantProgressCirclesFor,
      isChantCompleted: isChantCompletedFor,
      getAudioStatus: getAudioStatusFor,
    }),
    [
      details,
      course,
      progress,
      contents,
      videos,
      books,
      chants,
      audioAssignments,
      activities,
      progressSummary,
      videoWatchesByVideoId,
      bookReadingsByBookId,
      isLoading,
      isLoadingVideoWatches,
      isLoadingBookReadings,
      error,
      fetchModuleDetails,
      refreshVideoWatches,
      refreshBookReadings,
      updateContentProgress,
      markCourseCompleted,
      markVideoWatched,
      clearModule,
      clearError,
      getVideoProgressCirclesFor,
      isVideoCompletedFor,
      getBookProgressCirclesFor,
      isBookCompletedFor,
      getChantProgressCirclesFor,
      isChantCompletedFor,
      getAudioStatusFor,
    ]
  );
}
