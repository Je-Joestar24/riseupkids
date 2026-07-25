/**
 * Chant Service
 *
 * API client for chant progress operations.
 * - Start chant for a child (creates progress)
 * - Get chant progress
 * - Complete chant (JSON watch-only, or multipart with recorded audio)
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

export interface ChantProgress {
  _id: string;
  chant: string | { _id: string; title?: string; instructions?: string; instructionVideo?: unknown };
  child: string;
  status: 'not_started' | 'in_progress' | 'completed';
  starsEarned?: number;
  recordedAudioUrl?: string;
  recordedAudioPath?: string;
  timeSpent?: number;
  completedAt?: string;
  [key: string]: unknown;
}

export interface CompleteChantWatchPayload {
  timeSpent?: number;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const chantService = {
  /**
   * Start chant for a child (creates progress if missing)
   * POST /api/chants/:chantId/child/:childId/start
   */
  start: async (
    chantId: string,
    childId: string
  ): Promise<ApiResponse<ChantProgress>> => {
    const res = await api.post<ApiResponse<ChantProgress>>(
      `/chants/${chantId}/child/${childId}/start`
    );
    return res as ApiResponse<ChantProgress>;
  },

  /**
   * Get chant progress for a child
   * GET /api/chants/:chantId/child/:childId/progress
   */
  getProgress: async (
    chantId: string,
    childId: string
  ): Promise<ApiResponse<ChantProgress>> => {
    const res = await api.get<ApiResponse<ChantProgress>>(
      `/chants/${chantId}/child/${childId}/progress`
    );
    return res as ApiResponse<ChantProgress>;
  },

  /**
   * Watch-only completion (no recording). Uses JSON to avoid RN multipart boundary bugs.
   * POST /api/chants/:chantId/child/:childId/complete
   */
  completeWatch: async (
    chantId: string,
    childId: string,
    payload: CompleteChantWatchPayload = {}
  ): Promise<ApiResponse<ChantProgress>> => {
    const res = await api.post<ApiResponse<ChantProgress>>(
      `/chants/${chantId}/child/${childId}/complete`,
      {
        timeSpent: payload.timeSpent ?? 0,
        metadata: payload.metadata ?? { completionType: 'watch' },
      }
    );
    return res as ApiResponse<ChantProgress>;
  },

  /**
   * Complete chant with child's recorded audio (multipart).
   * Do NOT set Content-Type manually — the client must add the multipart boundary.
   */
  complete: async (
    chantId: string,
    childId: string,
    formData: FormData
  ): Promise<ApiResponse<ChantProgress>> => {
    const res = await api.post<ApiResponse<ChantProgress>>(
      `/chants/${chantId}/child/${childId}/complete`,
      formData
    );
    return res as ApiResponse<ChantProgress>;
  },
};

export { chantService };
