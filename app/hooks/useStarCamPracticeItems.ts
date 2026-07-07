import { useMemo } from 'react';

import type { StarCamChildMissionStartPayload } from '@/services/childStarCamService';
import {
  buildStarCamPracticeSequenceItems,
  type StarCamPracticeSequenceItem,
} from '@/services/starCamPracticeMedia';
import {
  getStarCamScopedMediaCache,
  starCamCacheKeysMatch,
  starCamMissionKeysMatch,
} from '@/services/starCamMissionMedia';
import { useStarCamStore } from '@/store/starCamStore';

export type { StarCamPracticeSequenceItem };

export function useStarCamPracticeItems(
  missionFlow: StarCamChildMissionStartPayload | null,
  routeMissionId?: string | null
) {
  const cachedMissionId = useStarCamStore((s) => s.cachedMissionId);
  const cachedMediaUris = useStarCamStore((s) => s.cachedMediaUris);
  const missionKey = routeMissionId ?? missionFlow?.mission?.missionId ?? null;

  const practiceItems = missionFlow?.flow?.practice?.items ?? [];

  const scopedCache = getStarCamScopedMediaCache(
    missionKey,
    cachedMissionId,
    cachedMediaUris,
    missionFlow
  );

  const items = useMemo(
    () => buildStarCamPracticeSequenceItems(practiceItems, scopedCache),
    [practiceItems, scopedCache]
  );

  const isFlowReady = starCamMissionKeysMatch(missionKey, missionFlow);
  const isCacheReady = starCamCacheKeysMatch(cachedMissionId, missionKey, missionFlow);
  const isMediaReady = isFlowReady;

  return { items, isMediaReady, isFlowReady, isCacheReady, scopedCache };
}
