/**
 * Star Cam Store (Child runtime)
 *
 * Centralized, hook-friendly state for the Star Cam child flow:
 * 1) Load categories
 * 2) Load latest 3 missions for a category
 * 3) Load mission start flow (start → practice → starCam → completion)
 *
 * Uses `childStarCamService` for API calls.
 */

import { create } from 'zustand';

import { childStarCamService } from '@/services/childStarCamService';
import type {
  StarCamCategoryListItem,
  StarCamMissionListItem,
  StarCamChildMissionStartPayload,
  StarCamPracticeMaterialPayload,
  StarCamDetectObjectPayload,
} from '@/services/childStarCamService';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface StarCamState {
  categories: StarCamCategoryListItem[];
  missions: StarCamMissionListItem[];

  selectedCategoryKey: string | null;
  selectedMissionId: string | null;

  /** Latest loaded mission flow payload (start + practice + starCam + completion). */
  missionFlow: StarCamChildMissionStartPayload | null;
  /** Dedicated practice material payload (e.g. index 6 target vocab). */
  practiceMaterial: StarCamPracticeMaterialPayload | null;

  isLoadingCategories: boolean;
  isLoadingMissions: boolean;
  isLoadingMissionFlow: boolean;
  isLoadingPracticeMaterial: boolean;
  isDetectingObject: boolean;

  error: string | null;
  lastDetection: StarCamDetectObjectPayload | null;
  /** Remote http(s) URL → local file URI after mission preload. */
  cachedMediaUris: Record<string, string>;
}

export interface StarCamActions {
  /** Fetch categories for a child. */
  fetchCategories: (childId: string) => Promise<StarCamCategoryListItem[]>;
  /** Select a category (clears missions/missionFlow). */
  selectCategory: (categoryKey: string | null) => void;
  /** Fetch latest 3 missions for a category. Also sets selectedCategoryKey. */
  fetchLatestMissionsByCategory: (childId: string, categoryKey: string) => Promise<StarCamMissionListItem[]>;
  /** Select a mission (does not fetch). */
  selectMission: (missionId: string | null) => void;
  /** Fetch mission flow by missionId or mission slug. Also sets selectedMissionId. */
  fetchMissionStartFlow: (childId: string, missionIdOrSlug: string) => Promise<StarCamChildMissionStartPayload | null>;
  /** Fetch dedicated practice material by mission + vocab index. */
  fetchMissionPracticeMaterial: (
    childId: string,
    missionIdOrSlug: string,
    index?: number
  ) => Promise<StarCamPracticeMaterialPayload | null>;
  detectMissionObject: (
    childId: string,
    missionIdOrSlug: string,
    image: { uri: string; name?: string; type?: string },
    options?: { itemOrder?: number; sortOrder?: number }
  ) => Promise<StarCamDetectObjectPayload | null>;
  /** Replace mission media URI map. */
  setCachedMediaUris: (map: Record<string, string>) => void;
  /** Merge downloaded URIs into the cache map (after preload). */
  mergeCachedMediaUris: (map: Record<string, string>) => void;
  /** Clear loaded mission flow. */
  clearMissionFlow: () => void;
  /** Clear error. */
  clearError: () => void;
  /** Reset whole store. */
  reset: () => void;
}

const initialState: StarCamState = {
  categories: [],
  missions: [],
  selectedCategoryKey: null,
  selectedMissionId: null,
  missionFlow: null,
  practiceMaterial: null,
  isLoadingCategories: false,
  isLoadingMissions: false,
  isLoadingMissionFlow: false,
  isLoadingPracticeMaterial: false,
  isDetectingObject: false,
  error: null,
  lastDetection: null,
  cachedMediaUris: {},
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStarCamStore = create<StarCamState & StarCamActions>((set, get) => ({
  ...initialState,

  fetchCategories: async (childId) => {
    set({ isLoadingCategories: true, error: null });
    try {
      const res = await childStarCamService.getCategories(childId);
      const items = res?.success ? res.data?.items ?? [] : [];
      set({ categories: items, isLoadingCategories: false });
      return items;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoadingCategories: false });
      return [];
    }
  },

  selectCategory: (categoryKey) => {
    set({
      selectedCategoryKey: categoryKey,
      missions: [],
      selectedMissionId: null,
      missionFlow: null,
      practiceMaterial: null,
      cachedMediaUris: {},
      error: null,
    });
  },

  fetchLatestMissionsByCategory: async (childId, categoryKey) => {
    set({
      isLoadingMissions: true,
      error: null,
      selectedCategoryKey: categoryKey,
      missions: [],
      missionFlow: null,
      practiceMaterial: null,
      cachedMediaUris: {},
    });
    try {
      const res = await childStarCamService.getLatestMissionsByCategory(childId, categoryKey);
      const items = res?.success ? res.data?.items ?? [] : [];
      set({ missions: items, isLoadingMissions: false });
      return items;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoadingMissions: false });
      return [];
    }
  },

  selectMission: (missionId) =>
    set({ selectedMissionId: missionId, missionFlow: null, practiceMaterial: null, cachedMediaUris: {}, error: null }),

  setCachedMediaUris: (map) => set({ cachedMediaUris: map }),
  mergeCachedMediaUris: (map) =>
    set((state) => ({
      cachedMediaUris: { ...state.cachedMediaUris, ...map },
    })),

  fetchMissionStartFlow: async (childId, missionIdOrSlug) => {
    set({ isLoadingMissionFlow: true, error: null, selectedMissionId: missionIdOrSlug, missionFlow: null });
    try {
      const res = await childStarCamService.getMissionStartFlow(childId, missionIdOrSlug);
      const flow = res?.success ? res.data ?? null : null;
      set({ missionFlow: flow, isLoadingMissionFlow: false });
      return flow;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoadingMissionFlow: false });
      return null;
    }
  },

  fetchMissionPracticeMaterial: async (childId, missionIdOrSlug, index = 6) => {
    set({ isLoadingPracticeMaterial: true, error: null, selectedMissionId: missionIdOrSlug, practiceMaterial: null });
    try {
      const res = await childStarCamService.getMissionPracticeMaterial(childId, missionIdOrSlug, index);
      const payload = res?.success ? res.data ?? null : null;
      set({ practiceMaterial: payload, isLoadingPracticeMaterial: false });
      return payload;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isLoadingPracticeMaterial: false });
      return null;
    }
  },

  detectMissionObject: async (childId, missionIdOrSlug, image, options = {}) => {
    set({ isDetectingObject: true, error: null });
    try {
      const res = await childStarCamService.detectMissionObject(childId, missionIdOrSlug, image, options);
      const payload = res?.success ? res.data ?? null : null;
      if (!payload) {
        const err = new Error('Detector returned empty payload');
        set({ isDetectingObject: false, error: err.message });
        throw err;
      }
      set({ lastDetection: payload, isDetectingObject: false });
      return payload;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: msg, isDetectingObject: false });
      throw err instanceof Error ? err : new Error(msg);
    }
  },

  clearMissionFlow: () => set({ missionFlow: null, practiceMaterial: null, cachedMediaUris: {} }),

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));

