import { api } from '@/services/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface PlayerMedia {
  id: string;
  type: string | null;
  url: string | null;
  mimeType: string | null;
}

export interface PlayerInteractionOption {
  optionId: string;
  label: string;
  imageMediaId?: string | null;
  audioMediaId?: string | null;
  imageMedia?: PlayerMedia | null;
  audioMedia?: PlayerMedia | null;
}

export interface PlayerInteractionDropZone {
  zoneId: string;
  label: string;
  correctOptionId: string;
}

export interface PlayerInteractionConfig {
  kind: 'drag_2x2' | 'drag_2x1' | null;
  allowRetry?: boolean;
  options?: PlayerInteractionOption[];
  dropZones?: PlayerInteractionDropZone[];
}

export interface PlayerReadingWord {
  w: string;
  start: number;
  end: number;
}

export interface PlayerReading {
  text: string | null;
  durationSec: number | null;
  words: PlayerReadingWord[];
}

export interface PlayerPageMedia {
  imageMediaId?: string | null;
  audioMediaId?: string | null;
  videoMediaId?: string | null;
  instructionAudioMediaId?: string | null;
  backgroundImageMediaId?: string | null;
  guideImageMediaId?: string | null;
  guideImageMediaIds?: string[];
  imageMedia?: PlayerMedia | null;
  audioMedia?: PlayerMedia | null;
  videoMedia?: PlayerMedia | null;
  instructionAudioMedia?: PlayerMedia | null;
  backgroundImageMedia?: PlayerMedia | null;
  guideImageMedia?: PlayerMedia | null;
  guideImageMedias?: PlayerMedia[];
}

export interface CmsPlayablePage {
  pageId: string;
  order: number;
  type:
    | 'cover'
    | 'demo'
    | 'activity_demo_video'
    | 'content'
    | 'activity_drag_2x2'
    | 'activity_drag_2x1'
    | 'reward'
    | 'end';
  title: string | null;
  subtitle: string | null;
  media: PlayerPageMedia;
  reading: PlayerReading | null;
  interaction: PlayerInteractionConfig | null;
  navigation: {
    allowBack: boolean;
    allowNext: boolean;
    requireCompletionToNext: boolean;
  };
  scoring: {
    enabled: boolean;
    points: number;
    awardMode: 'once_on_correct';
  };
}

export interface CmsPlayableBookSummary {
  id: string;
  title: string;
  description: string | null;
  language: string;
  version: number;
  coverImageMediaId: string | null;
  totalPages: number;
  updatedAt: string;
}

export interface CmsPlayableBooksResult {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  items: CmsPlayableBookSummary[];
}

export interface CmsPlayableBookDetail {
  id: string;
  title: string;
  description: string | null;
  language: string;
  version: number;
  pages: CmsPlayablePage[];
}

export interface BuiltInBookCompletionPayload {
  score: number;
  maxScore: number;
  status: 'not_started' | 'in_progress' | 'completed' | string;
  timeSpent: number;
  progress: number;
}

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeCompletionPayload(
  payload: BuiltInBookCompletionPayload
): BuiltInBookCompletionPayload {
  return {
    ...payload,
    score: Math.max(0, Number(payload.score) || 0),
    maxScore: Math.max(0, Number(payload.maxScore) || 0),
    timeSpent: Math.max(0, Number(payload.timeSpent) || 0),
    progress: clampRange(Number(payload.progress) || 0, 0, 100),
  };
}

export const cmsBooksPlayerService = {
  listPlayableBooks: (
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      language?: string;
    }
  ): Promise<ApiResponse<CmsPlayableBooksResult>> =>
    api.get<ApiResponse<CmsPlayableBooksResult>>('/cms-book-player/playable', {
      params,
    }),

  getPlayableBook: (bookId: string): Promise<ApiResponse<CmsPlayableBookDetail>> =>
    api.get<ApiResponse<CmsPlayableBookDetail>>(`/cms-book-player/${bookId}/play`),

  submitBuiltInBookCompletion: (
    courseId: string,
    childId: string,
    bookId: string,
    payload: BuiltInBookCompletionPayload
  ): Promise<ApiResponse<unknown>> =>
    api.post<ApiResponse<unknown>>(
      `/course-progress/${courseId}/child/${childId}/book/${bookId}/complete`,
      normalizeCompletionPayload(payload)
    ),
};
