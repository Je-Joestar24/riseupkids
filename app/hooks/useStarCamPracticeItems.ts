import { useMemo } from 'react';

import type { StarCamChildMissionStartPayload } from '@/services/childStarCamService';
import {
  buildStarCamPracticeSequenceItems,
  type StarCamPracticeSequenceItem,
} from '@/services/starCamPracticeMedia';
import { useStarCamStore } from '@/store/starCamStore';

export type { StarCamPracticeSequenceItem };

export function useStarCamPracticeItems(missionFlow: StarCamChildMissionStartPayload | null) {
  const cachedMediaUris = useStarCamStore((s) => s.cachedMediaUris);

  const practiceItems = missionFlow?.flow?.practice?.items ?? [];

  const items = useMemo(
    () => buildStarCamPracticeSequenceItems(practiceItems, cachedMediaUris),
    [practiceItems, cachedMediaUris]
  );

  const isMediaReady = Boolean(missionFlow);

  return { items, isMediaReady };
}
