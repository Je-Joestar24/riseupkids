/**
 * Video Watch Service
 *
 * API client for video watch tracking.
 * - Mark video as watched (completed)
 * - Get video watch status for a child
 * - Get all video watches for a child
 * - Reset video watch count (admin/parent)
 *
 * Mirrors frontend videoWatchService and backend /api/video-watch/*
 */

import { api } from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface VideoWatchStatus {
  videoId: string;
  currentWatchCount: number;
  requiredWatchCount: number;
  starsAwarded?: boolean;
  starsAwardedAt?: string;
  watchHistory?: Array<{ watchedAt: string }>;
  [key: string]: unknown;
}

export interface MarkVideoWatchedResult {
  videoWatch: VideoWatchStatus;
  requiredWatchCount: number;
  starsAwarded?: boolean;
  starsAwardedAt?: string | null;
  starsToAward?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const videoWatchService = {
  /**
   * Mark video as watched (completed)
   * POST /api/video-watch/:videoId/child/:childId
   * Body: { completionPercentage: 0-100 }
   */
  markVideoWatched: async (
    videoId: string,
    childId: string,
    completionPercentage: number = 100
  ): Promise<ApiResponse<MarkVideoWatchedResult>> => {
    const res = await api.post<ApiResponse<MarkVideoWatchedResult>>(
      `/video-watch/${videoId}/child/${childId}`,
      {
        completionPercentage: Math.max(0, Math.min(100, completionPercentage)),
      }
    );
    return res as ApiResponse<MarkVideoWatchedResult>;
  },

  /**
   * Get video watch status for a child
   * GET /api/video-watch/:videoId/child/:childId
   */
  getVideoWatchStatus: async (
    videoId: string,
    childId: string
  ): Promise<ApiResponse<VideoWatchStatus>> => {
    const res = await api.get<ApiResponse<VideoWatchStatus>>(
      `/video-watch/${videoId}/child/${childId}`
    );
    return res as ApiResponse<VideoWatchStatus>;
  },

  /**
   * Get all video watch statuses for a child
   * GET /api/video-watch/child/:childId
   */
  getChildVideoWatches: async (
    childId: string
  ): Promise<ApiResponse<VideoWatchStatus[]>> => {
    const res = await api.get<ApiResponse<VideoWatchStatus[]>>(
      `/video-watch/child/${childId}`
    );
    return res as ApiResponse<VideoWatchStatus[]>;
  },

  /**
   * Reset video watch count for a child (admin/parent)
   * DELETE /api/video-watch/:videoId/child/:childId
   */
  resetVideoWatch: async (
    videoId: string,
    childId: string
  ): Promise<ApiResponse<unknown>> => {
    const res = await api.delete<ApiResponse<unknown>>(
      `/video-watch/${videoId}/child/${childId}`
    );
    return res as ApiResponse<unknown>;
  },
};

export { videoWatchService };
