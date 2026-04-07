/**
 * Star Cam Hook
 *
 * Hook wrapper around `useStarCamStore`:
 * - exposes state for category/mission/flow screens
 * - provides stable actions for each step in the child flow
 * - keeps UI code minimal and focused
 */

import { useCallback, useEffect, useMemo } from 'react';

import { useStarCamStore } from '@/store/starCamStore';
import type {
  StarCamCategoryListItem,
  StarCamMissionListItem,
  StarCamChildMissionStartPayload,
  StarCamMissionMapBubble,
} from '@/services/childStarCamService';

export interface UseStarCamReturn {
  // State
  categories: StarCamCategoryListItem[];
  missions: StarCamMissionListItem[];
  selectedCategoryKey: string | null;
  selectedMissionId: string | null;
  missionFlow: StarCamChildMissionStartPayload | null;
  isLoadingCategories: boolean;
  isLoadingMissions: boolean;
  isLoadingMissionFlow: boolean;
  error: string | null;
  // Derived
  hasCategories: boolean;
  hasMissions: boolean;
  practiceItems: StarCamChildMissionStartPayload['flow']['practice']['items'];
  huntItems: StarCamChildMissionStartPayload['flow']['starCam']['items'];
  // Actions
  loadCategories: (childId: string) => Promise<StarCamCategoryListItem[]>;
  chooseCategory: (categoryKey: string | null) => void;
  loadMissionsByCategory: (childId: string, categoryKey: string) => Promise<StarCamMissionListItem[]>;
  chooseMission: (missionId: string | null) => void;
  loadMissionFlow: (childId: string, missionIdOrSlug: string) => Promise<StarCamChildMissionStartPayload | null>;
  clearMissionFlow: () => void;
  clearError: () => void;
  reset: () => void;
}

export function useStarCam(): UseStarCamReturn {
  const categories = useStarCamStore((s) => s.categories);
  const missions = useStarCamStore((s) => s.missions);
  const selectedCategoryKey = useStarCamStore((s) => s.selectedCategoryKey);
  const selectedMissionId = useStarCamStore((s) => s.selectedMissionId);
  const missionFlow = useStarCamStore((s) => s.missionFlow);
  const isLoadingCategories = useStarCamStore((s) => s.isLoadingCategories);
  const isLoadingMissions = useStarCamStore((s) => s.isLoadingMissions);
  const isLoadingMissionFlow = useStarCamStore((s) => s.isLoadingMissionFlow);
  const error = useStarCamStore((s) => s.error);

  const fetchCategories = useStarCamStore((s) => s.fetchCategories);
  const selectCategory = useStarCamStore((s) => s.selectCategory);
  const fetchLatestMissionsByCategory = useStarCamStore((s) => s.fetchLatestMissionsByCategory);
  const selectMission = useStarCamStore((s) => s.selectMission);
  const fetchMissionStartFlow = useStarCamStore((s) => s.fetchMissionStartFlow);
  const clearFlow = useStarCamStore((s) => s.clearMissionFlow);
  const clearStoreError = useStarCamStore((s) => s.clearError);
  const resetStore = useStarCamStore((s) => s.reset);

  const loadCategories = useCallback(
    (childId: string) => fetchCategories(childId),
    [fetchCategories]
  );

  const chooseCategory = useCallback(
    (categoryKey: string | null) => selectCategory(categoryKey),
    [selectCategory]
  );

  const loadMissionsByCategory = useCallback(
    (childId: string, categoryKey: string) =>
      fetchLatestMissionsByCategory(childId, categoryKey),
    [fetchLatestMissionsByCategory]
  );

  const chooseMission = useCallback(
    (missionId: string | null) => selectMission(missionId),
    [selectMission]
  );

  const loadMissionFlow = useCallback(
    (childId: string, missionIdOrSlug: string) =>
      fetchMissionStartFlow(childId, missionIdOrSlug),
    [fetchMissionStartFlow]
  );

  const clearMissionFlow = useCallback(() => clearFlow(), [clearFlow]);
  const clearError = useCallback(() => clearStoreError(), [clearStoreError]);
  const reset = useCallback(() => resetStore(), [resetStore]);

  const practiceItems = useMemo(
    () => missionFlow?.flow?.practice?.items ?? [],
    [missionFlow]
  );
  const huntItems = useMemo(
    () => missionFlow?.flow?.starCam?.items ?? [],
    [missionFlow]
  );

  return useMemo(
    () => ({
      categories,
      missions,
      selectedCategoryKey,
      selectedMissionId,
      missionFlow,
      isLoadingCategories,
      isLoadingMissions,
      isLoadingMissionFlow,
      error,
      hasCategories: categories.length > 0,
      hasMissions: missions.length > 0,
      practiceItems,
      huntItems,
      loadCategories,
      chooseCategory,
      loadMissionsByCategory,
      chooseMission,
      loadMissionFlow,
      clearMissionFlow,
      clearError,
      reset,
    }),
    [
      categories,
      missions,
      selectedCategoryKey,
      selectedMissionId,
      missionFlow,
      isLoadingCategories,
      isLoadingMissions,
      isLoadingMissionFlow,
      error,
      practiceItems,
      huntItems,
      loadCategories,
      chooseCategory,
      loadMissionsByCategory,
      chooseMission,
      loadMissionFlow,
      clearMissionFlow,
      clearError,
      reset,
    ]
  );
}

export default useStarCam;

const READING_MAP_EMOJI_CYCLE = ['📖', '📚', '🎧'] as const;

function mapMissionListToMapBubblesWithCycle(
  missions: StarCamMissionListItem[],
  emojiCycle: readonly string[]
): StarCamMissionMapBubble[] {
  return missions.map((m, i) => ({
    id: m.id,
    missionId: m.missionId,
    title: m.title,
    emoji: emojiCycle[i % emojiCycle.length],
    imageUrl: m.introImageUrl ?? null,
  }));
}

/**
 * Latest missions for any Star Cam category (map bubbles + prefetch flow on tap).
 */
export function useStarCamCategoryMissions(
  childId: string | null,
  categoryKey: string,
  emojiCycle: readonly string[]
) {
  const missions = useStarCamStore((s) => s.missions);
  const selectedCategoryKey = useStarCamStore((s) => s.selectedCategoryKey);
  const isLoadingMissions = useStarCamStore((s) => s.isLoadingMissions);
  const fetchLatestMissionsByCategory = useStarCamStore((s) => s.fetchLatestMissionsByCategory);
  const fetchMissionStartFlow = useStarCamStore((s) => s.fetchMissionStartFlow);

  const refresh = useCallback(() => {
    if (!childId || !categoryKey) return Promise.resolve([] as StarCamMissionListItem[]);
    return fetchLatestMissionsByCategory(childId, categoryKey);
  }, [childId, categoryKey, fetchLatestMissionsByCategory]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const mapBubbles = useMemo(() => {
    if (selectedCategoryKey !== categoryKey) return [];
    return mapMissionListToMapBubblesWithCycle(missions, emojiCycle);
  }, [missions, selectedCategoryKey, categoryKey, emojiCycle]);

  const selectMissionForFlow = useCallback(
    async (missionIdSlug: string) => {
      if (!childId) return null;
      return fetchMissionStartFlow(childId, missionIdSlug);
    },
    [childId, fetchMissionStartFlow]
  );

  return useMemo(
    () => ({
      mapBubbles,
      isLoadingMissions: Boolean(childId) && isLoadingMissions,
      refresh,
      selectMissionForFlow,
    }),
    [mapBubbles, childId, isLoadingMissions, refresh, selectMissionForFlow]
  );
}

export function useStarCamReadingMissions(childId: string | null) {
  return useStarCamCategoryMissions(childId, 'reading', READING_MAP_EMOJI_CYCLE);
}

