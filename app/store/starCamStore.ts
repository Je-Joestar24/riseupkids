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

  isLoadingCategories: boolean;
  isLoadingMissions: boolean;
  isLoadingMissionFlow: boolean;

  error: string | null;
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
  isLoadingCategories: false,
  isLoadingMissions: false,
  isLoadingMissionFlow: false,
  error: null,
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
      error: null,
    });
  },

  fetchLatestMissionsByCategory: async (childId, categoryKey) => {
    set({ isLoadingMissions: true, error: null, selectedCategoryKey: categoryKey, missions: [], missionFlow: null });
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

  selectMission: (missionId) => set({ selectedMissionId: missionId, missionFlow: null, error: null }),

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

  clearMissionFlow: () => set({ missionFlow: null }),

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));

