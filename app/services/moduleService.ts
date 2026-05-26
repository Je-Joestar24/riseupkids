/**
 * Module Service
 *
 * Centralized API layer for the child module (course detail) screen:
 * - Course details with populated contents (videos, books, chants, audio, activities)
 * - Course progress and content progress
 * - Video watch tracking
 * - Book reading tracking
 * - Content progress updates and course completion
 *
 * All methods use the shared api client and return typed responses.
 */

import { api } from '@/services/api';

// ---------------------------------------------------------------------------
// Content types (align with backend)
// ---------------------------------------------------------------------------

export const CONTENT_TYPES = {
  ACTIVITY: 'activity',
  BOOK: 'book',
  VIDEO: 'video',
  AUDIO_ASSIGNMENT: 'audioAssignment',
  CHANT: 'chant',
} as const;

export type ContentType =
  | 'activity'
  | 'book'
  | 'video'
  | 'audioAssignment'
  | 'chant';

// ---------------------------------------------------------------------------
// Generic API response shape (backend convention)
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// ---------------------------------------------------------------------------
// Course & progress shapes (from backend getCourseDetailsForChild)
// ---------------------------------------------------------------------------

export interface ContentProgressItem {
  contentId: string;
  contentType: ContentType;
  step?: number;
  status: 'not_started' | 'in_progress' | 'completed';
  scormProgress?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CourseProgressDoc {
  _id: string;
  course: string;
  child: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progressPercentage: number;
  contentProgress?: ContentProgressItem[];
  startedAt?: string;
  completedAt?: string;
  [key: string]: unknown;
}

export interface PopulatedContentItem {
  _id: string;
  _contentId: string;
  _contentType: ContentType;
  _order?: number;
  _step?: number;
  _addedAt?: string;
  title?: string;
  description?: string;
  coverImage?: string;
  thumbnail?: string;
  /** Book package type; when 'html5' the app opens HTML5 modal (SCORM not supported in app). */
  packageType?: 'scorm' | 'html5' | 'builtin';
  /** When packageType === 'html5', id for GET /api/html5handler/:id/launch and static /html5/:id/ */
  html5PackageId?: string;
  /** Entry file e.g. index.html (when packageType === 'html5'). */
  html5EntryPoint?: string;
  /** When packageType === 'builtin', linked published CmsBook id (GET /api/cms-book-player/:id/play). */
  cmsBookId?: string | { _id?: string } | null;
  /** Optional video follow-up launched after playback. */
  completionContentType?: 'none' | 'scorm' | 'html5' | 'builtin';
  [key: string]: unknown;
}

export interface CourseWithContents {
  _id: string;
  title: string;
  description?: string;
  /** Backend returns this (e.g. /uploads/courses/xxx.jpeg) */
  coverImage?: string;
  coverImagePath?: string;
  stepOrder?: number;
  contents: PopulatedContentItem[];
  contentsBySteps?: unknown;
  [key: string]: unknown;
}

export interface ChildProfileStub {
  _id: string;
  displayName?: string;
  [key: string]: unknown;
}

export interface ModuleDetailsPayload {
  course: CourseWithContents;
  child: ChildProfileStub;
  progress: CourseProgressDoc | null;
  accessible: boolean;
  missingPrerequisites: unknown[];
}

// ---------------------------------------------------------------------------
// Video watch (backend: /api/video-watch)
// ---------------------------------------------------------------------------

export interface VideoWatchStatus {
  videoId: string;
  currentWatchCount: number;
  requiredWatchCount: number;
  starsAwarded: boolean;
  starsAwardedAt?: string;
  watchHistory?: Array<{ watchedAt: string }>;
  [key: string]: unknown;
}

export interface MarkVideoWatchedPayload {
  videoWatch: VideoWatchStatus;
  requiredWatchCount: number;
  starsAwarded?: boolean;
  starsAwardedAt?: string | null;
  starsToAward?: number;
}

// ---------------------------------------------------------------------------
// Book reading (backend: /api/book-reading)
// ---------------------------------------------------------------------------

export interface BookReadingStatus {
  bookId: string;
  currentReadingCount: number;
  requiredReadingCount: number;
  starsAwarded?: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Book completion (backend: POST .../book/:bookId/complete)
// ---------------------------------------------------------------------------

export interface SubmitBookCompletionBody {
  score: number;
  maxScore: number;
  status: string;
  timeSpent: number;
  progress: number;
}

// ---------------------------------------------------------------------------
// Module service implementation
// ---------------------------------------------------------------------------

const moduleService = {
  /**
   * Get course details for child: course with populated contents, progress, access.
   * Single source for the module screen.
   */
  getCourseDetailsForChild: (
    courseId: string,
    childId: string
  ): Promise<ApiResponse<ModuleDetailsPayload>> =>
    api.get<ApiResponse<ModuleDetailsPayload>>(
      `/course-progress/${courseId}/child/${childId}/details`
    ),

  /**
   * Get course progress only (lighter than details).
   */
  getCourseProgress: (
    courseId: string,
    childId: string
  ): Promise<ApiResponse<CourseProgressDoc>> =>
    api.get<ApiResponse<CourseProgressDoc>>(
      `/course-progress/${courseId}/child/${childId}`
    ),

  /** Check if child can access the course. */
  checkCourseAccess: (
    courseId: string,
    childId: string
  ): Promise<ApiResponse<{ accessible: boolean; [key: string]: unknown }>> =>
    api.get<ApiResponse<{ accessible: boolean }>>(
      `/course-progress/${courseId}/access/${childId}`
    ),

  /**
   * Update content progress when a content item is completed.
   */
  updateContentProgress: (
    courseId: string,
    childId: string,
    contentId: string,
    contentType: ContentType
  ): Promise<ApiResponse<unknown>> =>
    api.patch<ApiResponse<unknown>>(
      `/course-progress/${courseId}/child/${childId}/content`,
      { contentId, contentType }
    ),

  /**
   * Mark course as completed.
   */
  markCourseCompleted: (
    courseId: string,
    childId: string
  ): Promise<ApiResponse<unknown>> =>
    api.post<ApiResponse<unknown>>(
      `/course-progress/${courseId}/child/${childId}/complete`
    ),

  /**
   * Submit book reading completion (SCORM-style).
   */
  submitBookCompletion: (
    courseId: string,
    childId: string,
    bookId: string,
    body: SubmitBookCompletionBody
  ): Promise<ApiResponse<unknown>> =>
    api.post<ApiResponse<unknown>>(
      `/course-progress/${courseId}/child/${childId}/book/${bookId}/complete`,
      body
    ),

  // ----- Video watch -----

  markVideoWatched: (
    videoId: string,
    childId: string,
    completionPercentage: number = 100
  ): Promise<ApiResponse<MarkVideoWatchedPayload>> =>
    api.post<ApiResponse<MarkVideoWatchedPayload>>(
      `/video-watch/${videoId}/child/${childId}`,
      { completionPercentage: Math.max(0, Math.min(100, completionPercentage)) }
    ),

  getVideoWatchStatus: (
    videoId: string,
    childId: string
  ): Promise<ApiResponse<VideoWatchStatus>> =>
    api.get<ApiResponse<VideoWatchStatus>>(
      `/video-watch/${videoId}/child/${childId}`
    ),

  getChildVideoWatches: (
    childId: string
  ): Promise<ApiResponse<VideoWatchStatus[]>> =>
    api.get<ApiResponse<VideoWatchStatus[]>>(`/video-watch/child/${childId}`),

  resetVideoWatch: (
    videoId: string,
    childId: string
  ): Promise<ApiResponse<unknown>> =>
    api.delete<ApiResponse<unknown>>(
      `/video-watch/${videoId}/child/${childId}`
    ),

  // ----- Book reading -----

  getBookReadingStatus: (
    bookId: string,
    childId: string
  ): Promise<ApiResponse<BookReadingStatus>> =>
    api.get<ApiResponse<BookReadingStatus>>(
      `/book-reading/${bookId}/child/${childId}`
    ),

  getChildBookReadings: (
    childId: string
  ): Promise<ApiResponse<BookReadingStatus[]>> =>
    api.get<ApiResponse<BookReadingStatus[]>>(`/book-reading/child/${childId}`),
};

export { moduleService };
