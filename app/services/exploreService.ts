/**
 * Explore Service (App)
 *
 * Read-only API client for Explore content — child/parent facing.
 * Plus explore video watch: mark watched, watch status, progress, total stars.
 *
 * Content endpoints:
 * - GET /explore — list with filters (backend forces isPublished: true for non-admin)
 * - GET /explore/type/:type — by type + optional videoType, pagination
 * - GET /explore/featured — featured items
 * - GET /explore/:id — single item
 *
 * Video watch (base /api/explore/videos):
 * - POST /:exploreContentId/watch/child/:childId — mark watched
 * - GET /:exploreContentId/watch-status/child/:childId — watch status
 * - GET /video-type/:videoType/total-stars/child/:childId — total stars for type
 * - GET /video-type/:videoType/progress/child/:childId — progress for type
 */

import { api } from '@/services/api';

// ---------------------------------------------------------------------------
// Types (match backend ExploreContent and API responses)
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ExplorePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/** Populated videoFile from backend (upload + Bunny embed) */
export interface ExploreVideoFile {
  _id: string;
  type?: string;
  title?: string;
  url?: string;
  /** `upload` (default) or `embed` (Bunny iframe) */
  videoSource?: 'upload' | 'embed';
  /** Canonical Bunny iframe URL when videoSource is embed */
  embedUrl?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
  thumbnail?: string;
}

/** Single explore content item (published view for child/parent) */
export interface ExploreContentItem {
  _id: string;
  title: string;
  description?: string | null;
  type: string;
  coverImage?: string | null;
  videoType?: string | null;
  videoFile?: ExploreVideoFile | null;
  videoFilePath?: string | null;
  videoFileUrl?: string | null;
  duration?: number | null;
  viewCount?: number;
  category?: string | null;
  starsAwarded?: number;
  order?: number;
  isFeatured?: boolean;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface ExploreListResponse {
  success: boolean;
  data?: ExploreContentItem[];
  pagination?: ExplorePagination;
  message?: string;
}

export interface ExploreSingleResponse {
  success: boolean;
  data?: ExploreContentItem;
  message?: string;
}

/** Query params for list/by-type (child/parent: only published) */
export interface ExploreListParams {
  type?: string;
  videoType?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Explore Video Watch types (backend exploreVideoWatch)
// ---------------------------------------------------------------------------

export interface ExploreWatchStatus {
  exploreContentId: string;
  videoId: string;
  videoTitle?: string;
  exploreContentTitle?: string;
  videoType?: string;
  isReplay?: boolean;
  currentWatchCount: number;
  requiredWatchCount: number;
  starsAwarded: boolean;
  starsAwardedAt?: string | null;
  starsToAward?: number;
  watchHistory?: Array<{ watchedAt: string; completionPercentage?: number }>;
}

export interface MarkExploreVideoWatchedResult {
  videoWatch: Record<string, unknown>;
  requiredWatchCount: number;
  starsAwarded?: boolean;
  starsAwardedAt?: string | null;
  starsToAward?: number;
  starsJustAwarded?: boolean;
  starsWereAlreadyAwarded?: boolean;
  isReplay?: boolean;
  duplicateWatch?: boolean;
}

export interface ExploreWatchStatusResponse {
  success: boolean;
  data?: ExploreWatchStatus;
  message?: string;
}

export interface MarkExploreVideoWatchedResponse {
  success: boolean;
  data?: MarkExploreVideoWatchedResult;
  message?: string;
}

export interface TotalStarsForVideoTypeResponse {
  success: boolean;
  data?: { videoType: string; totalStars: number };
  message?: string;
}

export interface VideoTypeProgressResponse {
  success: boolean;
  data?: { videoType: string; totalVideos: number; viewedVideos: number };
  message?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const exploreService = {
  /**
   * Get all explore content with filters and pagination.
   * Backend forces isPublished: true for non-admin/teacher.
   */
  getAll: (params: ExploreListParams = {}): Promise<ExploreListResponse> =>
    api.get<ExploreListResponse>('/explore', { params }).then((r) => r as ExploreListResponse),

  /**
   * Get explore content by type (e.g. "video") with optional videoType and pagination.
   * Backend returns only published content for this route.
   */
  getByType: (
    type: string,
    params: { videoType?: string; isFeatured?: boolean; page?: number; limit?: number } = {}
  ): Promise<ExploreListResponse> =>
    api
      .get<ExploreListResponse>(`/explore/type/${encodeURIComponent(type)}`, { params })
      .then((r) => r as ExploreListResponse),

  /**
   * Get featured explore content (published only). Returns array in data.
   */
  getFeatured: (limit: number = 10): Promise<ExploreListResponse> =>
    api
      .get<ExploreListResponse>('/explore/featured', { params: { limit } })
      .then((r) => r as ExploreListResponse),

  /**
   * Get single explore content by ID.
   * Backend returns 404 for non-admin if not published.
   */
  getById: (contentId: string): Promise<ExploreSingleResponse> =>
    api
      .get<ExploreSingleResponse>(`/explore/${contentId}`)
      .then((r) => r as ExploreSingleResponse),

  // -------------------------------------------------------------------------
  // Explore Video Watch (child/parent)
  // -------------------------------------------------------------------------

  /**
   * Mark explore video as watched (completed). Awards stars on first watch (except replay).
   */
  markExploreVideoWatched: (
    exploreContentId: string,
    childId: string,
    completionPercentage: number = 100
  ): Promise<MarkExploreVideoWatchedResponse> =>
    api
      .post<MarkExploreVideoWatchedResponse>(
        `/explore/videos/${exploreContentId}/watch/child/${childId}`,
        { completionPercentage: Math.max(0, Math.min(100, completionPercentage)) }
      )
      .then((r) => r as MarkExploreVideoWatchedResponse),

  /**
   * Get explore video watch status for a child.
   */
  getExploreVideoWatchStatus: (
    exploreContentId: string,
    childId: string
  ): Promise<ExploreWatchStatusResponse> =>
    api
      .get<ExploreWatchStatusResponse>(
        `/explore/videos/${exploreContentId}/watch-status/child/${childId}`
      )
      .then((r) => r as ExploreWatchStatusResponse),

  /**
   * Get total stars earned for a specific video type.
   */
  getTotalStarsForVideoType: (
    videoType: string,
    childId: string
  ): Promise<TotalStarsForVideoTypeResponse> =>
    api
      .get<TotalStarsForVideoTypeResponse>(
        `/explore/videos/video-type/${encodeURIComponent(videoType)}/total-stars/child/${childId}`
      )
      .then((r) => r as TotalStarsForVideoTypeResponse),

  /**
   * Get progress for a video type (total videos and viewed videos count).
   */
  getVideoTypeProgress: (
    videoType: string,
    childId: string
  ): Promise<VideoTypeProgressResponse> =>
    api
      .get<VideoTypeProgressResponse>(
        `/explore/videos/video-type/${encodeURIComponent(videoType)}/progress/child/${childId}`
      )
      .then((r) => r as VideoTypeProgressResponse),
};

export { exploreService };
