/**
 * Child Star Cam Service (runtime)
 *
 * Provides the child-flow APIs for Star Cam:
 * - Category selection
 * - Latest 3 missions per category
 * - Mission start payload (start → practice → starCam → completion)
 *
 * Notes:
 * - These endpoints intentionally include an `aiDetection` placeholder so the
 *   app can integrate an open-source on-device object detection model later.
 * - This service only fetches content; it does not perform any camera/AI work.
 */

import { api } from '@/services/api';

// ---------------------------------------------------------------------------
// Generic API response (backend convention)
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface StarCamCategoryListItem {
  id: string;
  key: string;
  name: string;
  description: string | null;
  missionCount: number;
}

export interface StarCamCategoryListPayload {
  items: StarCamCategoryListItem[];
}

// ---------------------------------------------------------------------------
// Mission list (latest 3)
// ---------------------------------------------------------------------------

export interface StarCamMissionListItem {
  id: string;
  missionId: string;
  title: string;
  introText: string;
  introImageUrl: string | null;
  vocabCount: number;
  itemCount: number;
}

export interface StarCamMissionListByCategoryPayload {
  category: {
    id: string;
    key: string;
    name: string;
    description: string | null;
  };
  items: StarCamMissionListItem[];
  limitApplied: number; // should be 3
}

/** One floating node on the category mission map (UI projection of `StarCamMissionListItem`). */
export interface StarCamMissionMapBubble {
  id: string;
  missionId: string;
  title: string;
  emoji: string;
  imageUrl?: string | null;
}

// ---------------------------------------------------------------------------
// Mission start flow payload (what the child UI consumes)
// ---------------------------------------------------------------------------

export interface AiDetectionPlaceholder {
  enabled: boolean;
  status: 'pending_integration';
  notes?: string;
}

export interface StarCamPracticeItem {
  order: number;
  displayText: string;
  target: string;
  imageUrl: string | null;
  pronunciationVideoUrl?: string | null;
  audioUrl: string | null;
  /** Default voice line suggestion (can be ignored by UI if audio file already contains it). */
  audioPrompt: string;
  /** Placeholder for future AI detection in practice screen. */
  aiDetection: AiDetectionPlaceholder;
}

export interface StarCamHuntItem {
  order: number;
  target: string;
  prompt: string;
  success: string;
  fail: string;
  showSampleImage: false;
}

export interface StarCamChildMissionStartPayload {
  mission: {
    id: string;
    missionId: string;
    title: string;
    category: { key: string | null; name: string | null };
  };
  flow: {
    start: {
      promptTitle: string;
      introText: string;
      introImageUrl: string | null;
    };
    practice: {
      promptTitle: string;
      items: StarCamPracticeItem[];
      featuredItem: StarCamPracticeItem | null;
    };
    starCam: {
      promptTitle: string;
      aiDetection: AiDetectionPlaceholder;
      items: StarCamHuntItem[];
    };
    completion: {
      promptTitle: string;
      title: string;
      subtitle: string;
      rewardImageUrl: string | null;
    };
  };
}

export interface StarCamPracticeMaterialPayload {
  mission: {
    id: string;
    missionId: string;
    title: string;
  };
  totalItems: number;
  requestedIndex: number;
  resolvedIndex: number;
  item: StarCamPracticeItem;
}

// ---------------------------------------------------------------------------
// Service implementation
// ---------------------------------------------------------------------------

export const childStarCamService = {
  /**
   * Step 1: list Star Cam categories available to the child (counts published missions).
   */
  getCategories: (childId: string): Promise<ApiResponse<StarCamCategoryListPayload>> =>
    api.get<ApiResponse<StarCamCategoryListPayload>>(
      `/child/star-cam/child/${childId}/categories`
    ),

  /**
   * Step 2: for a chosen category, load up to 3 latest published missions.
   * The backend currently caps this at 3.
   */
  getLatestMissionsByCategory: (
    childId: string,
    categoryKey: string
  ): Promise<ApiResponse<StarCamMissionListByCategoryPayload>> =>
    api.get<ApiResponse<StarCamMissionListByCategoryPayload>>(
      `/child/star-cam/child/${childId}/categories/${encodeURIComponent(categoryKey)}/missions`
    ),

  /**
   * Step 3+: get the full mission flow payload needed by the child UI:
   * - Start prompt
   * - Practice list (image + audio)
   * - Star Cam hunt list (prompt only; no sample image)
   * - Completion screen content
   */
  getMissionStartFlow: (
    childId: string,
    missionIdOrSlug: string
  ): Promise<ApiResponse<StarCamChildMissionStartPayload>> =>
    api.get<ApiResponse<StarCamChildMissionStartPayload>>(
      `/child/star-cam/child/${childId}/missions/${encodeURIComponent(missionIdOrSlug)}/start`
    ),

  /**
   * Dedicated practice sample material endpoint (independent from mission start flow).
   * Default app usage targets index 6 (7th vocabulary item).
   */
  getMissionPracticeMaterial: (
    childId: string,
    missionIdOrSlug: string,
    index = 6
  ): Promise<ApiResponse<StarCamPracticeMaterialPayload>> =>
    api.get<ApiResponse<StarCamPracticeMaterialPayload>>(
      `/child/star-cam/child/${childId}/missions/${encodeURIComponent(missionIdOrSlug)}/practice-material?index=${encodeURIComponent(String(index))}`
    ),
};

