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
import { API_BASE_URL } from '@/config';
import { getAuthToken } from '@/services/tokenBridge';
import { Platform } from 'react-native';

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
  status: 'pending_integration' | 'live';
  detectObjectPath?: string;
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
      rewardAudioUrl?: string | null;
      rewardVideoUrl?: string | null;
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

export interface StarCamDetectObjectPayload {
  missionId: string;
  target: string;
  status: 'matched' | 'not_matched';
  result: {
    isMatch: boolean;
    confidence: number;
    confidencePercent: number;
  };
  ui: {
    title: string;
    message: string;
    tone: 'success' | 'retry';
    nextAction: 'continue' | 'retry';
  };
  meta: {
    attemptId: string;
    processedAt: string;
    itemOrder: number | null;
    sortOrder: number;
    threshold: number;
    topLabels?: { description: string; score: number }[];
  };
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

  detectMissionObject: (
    childId: string,
    missionIdOrSlug: string,
    image: { uri: string; name?: string; type?: string },
    options: { itemOrder?: number; sortOrder?: number } = {}
  ): Promise<ApiResponse<StarCamDetectObjectPayload>> => {
    const queryParts: string[] = [];
    if (typeof options.itemOrder === 'number') queryParts.push(`itemOrder=${encodeURIComponent(String(options.itemOrder))}`);
    if (typeof options.sortOrder === 'number') queryParts.push(`sortOrder=${encodeURIComponent(String(options.sortOrder))}`);
    const query = queryParts.length ? `?${queryParts.join('&')}` : '';
    const endpoint = `/child/star-cam/child/${childId}/missions/${encodeURIComponent(missionIdOrSlug)}/detect-object${query}`;

    // Use fetch for React Native file upload reliability (Axios adapters can drop multipart file parts in some environments).
    return (async () => {
      const safeName = image.name || `star-cam-${Date.now()}.jpg`;
      const safeType = image.type || 'image/jpeg';
      const normalizedUri =
        Platform.OS === 'web'
          ? image.uri
          : image.uri.startsWith('file://') || image.uri.startsWith('content://')
            ? image.uri
            : `file://${image.uri}`;
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const blob = await fetch(normalizedUri).then((r) => r.blob());
        formData.append('image', blob, safeName);
      } else {
        formData.append('image', {
          uri: normalizedUri,
          name: safeName,
          type: safeType,
        } as never);
      }

      const token = getAuthToken();
      if (__DEV__) {
        console.log('[StarCamDetectDebug][app] upload-request', {
          endpoint,
          platform: Platform.OS,
          hasToken: Boolean(token),
          imageName: safeName,
          imageType: safeType,
          uriPreview: normalizedUri.slice(0, 80),
        });
      }
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      if (__DEV__) {
        console.log('[StarCamDetectDebug][app] upload-response', {
          status: response.status,
          ok: response.ok,
        });
      }
      const payload = (await response.json()) as ApiResponse<StarCamDetectObjectPayload>;
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || `Request failed (${response.status})`);
      }
      return payload;
    })();
  },
};

