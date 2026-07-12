/**
 * Audio Assignment Service
 *
 * API client for audio assignment progress operations.
 * - Start audio assignment for a child (creates progress)
 * - Get audio assignment progress
 * - Submit recorded audio (multipart/form-data)
 * - List submissions (admin/teacher)
 * - Review submission (approve/reject)
 *
 * Mirrors frontend audioAssignmentProgressService and backend /api/audio-assignments/:id/child/:childId/*
 */

import { api } from './api';
import {
  submitAudioAssignmentFormData,
  submitAudioAssignmentRecording,
  type SubmitAudioRecordingInput,
} from './audioAssignmentUpload';

export type { SubmitAudioRecordingInput };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface AudioAssignmentProgress {
  _id: string;
  audioAssignment:
    | string
    | {
        _id: string;
        title?: string;
        instructions?: string;
        instructionVideo?: unknown;
        referenceAudio?: unknown;
      };
  child: string;
  status: 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  starsEarned?: number;
  recordedAudio?:
    | string
    | {
        _id?: string;
        type?: string;
        title?: string;
        url?: string;
        mimeType?: string;
        size?: number;
        duration?: number;
      };
  recordedAudioUrl?: string;
  recordedAudioPath?: string;
  timeSpent?: number;
  adminFeedback?: string;
  submittedAt?: string;
  reviewedAt?: string;
  [key: string]: unknown;
}

export interface ListSubmissionsParams {
  page?: number;
  limit?: number;
  status?: string;
  childId?: string;
  audioAssignmentId?: string;
}

export interface ReviewInput {
  decision: 'approved' | 'rejected';
  feedback?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const audioAssignmentService = {
  /**
   * Start audio assignment for a child (creates progress if missing)
   * POST /api/audio-assignments/:audioAssignmentId/child/:childId/start
   */
  start: async (
    audioAssignmentId: string,
    childId: string
  ): Promise<ApiResponse<AudioAssignmentProgress>> => {
    const res = await api.post<ApiResponse<AudioAssignmentProgress>>(
      `/audio-assignments/${audioAssignmentId}/child/${childId}/start`
    );
    return res as ApiResponse<AudioAssignmentProgress>;
  },

  /**
   * Get audio assignment progress for a child
   * GET /api/audio-assignments/:audioAssignmentId/child/:childId/progress
   */
  getProgress: async (
    audioAssignmentId: string,
    childId: string
  ): Promise<ApiResponse<AudioAssignmentProgress>> => {
    const res = await api.get<ApiResponse<AudioAssignmentProgress>>(
      `/audio-assignments/${audioAssignmentId}/child/${childId}/progress`
    );
    return res as ApiResponse<AudioAssignmentProgress>;
  },

  /**
   * Submit child's recorded audio (native-safe multipart upload)
   * POST /api/audio-assignments/:audioAssignmentId/child/:childId/submit
   */
  submit: async (
    audioAssignmentId: string,
    childId: string,
    input: SubmitAudioRecordingInput
  ): Promise<ApiResponse<AudioAssignmentProgress>> => {
    return submitAudioAssignmentRecording(audioAssignmentId, childId, input);
  },

  /** @deprecated Prefer submit() with SubmitAudioRecordingInput */
  submitFormData: async (
    audioAssignmentId: string,
    childId: string,
    formData: FormData
  ): Promise<ApiResponse<AudioAssignmentProgress>> => {
    return submitAudioAssignmentFormData(audioAssignmentId, childId, formData);
  },

  /**
   * List audio assignment submissions (admin/teacher)
   * GET /api/audio-assignments/submissions
   */
  listSubmissions: async (
    params: ListSubmissionsParams = {}
  ): Promise<ApiResponse<AudioAssignmentProgress[]> & { pagination?: unknown }> => {
    const res = await api.get<
      ApiResponse<AudioAssignmentProgress[]> & { pagination?: unknown }
    >('/audio-assignments/submissions', { params });
    return res as ApiResponse<AudioAssignmentProgress[]> & { pagination?: unknown };
  },

  /**
   * Review a submitted audio assignment (approve/reject)
   * POST /api/audio-assignments/:audioAssignmentId/child/:childId/review
   */
  review: async (
    audioAssignmentId: string,
    childId: string,
    input: ReviewInput
  ): Promise<ApiResponse<AudioAssignmentProgress>> => {
    const res = await api.post<ApiResponse<AudioAssignmentProgress>>(
      `/audio-assignments/${audioAssignmentId}/child/${childId}/review`,
      { decision: input.decision, feedback: input.feedback }
    );
    return res as ApiResponse<AudioAssignmentProgress>;
  },
};

export { audioAssignmentService };
