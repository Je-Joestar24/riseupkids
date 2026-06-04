import { useEffect, useMemo, useRef, useState } from 'react';

import {
  isLocalMediaUri,
  preloadMediaAssetsToCache,
  snapshotCachedMediaUris,
} from '@/components/child/common/cms-player-media';
import type { StarCamChildMissionStartPayload } from '@/services/childStarCamService';
import { collectStarCamPracticeMediaUrls } from '@/services/starCamMissionMedia';
import {
  buildStarCamPracticeSequenceItems,
  type StarCamPracticeSequenceItem,
} from '@/services/starCamPracticeMedia';
import { useStarCamStore } from '@/store/starCamStore';

export type { StarCamPracticeSequenceItem };

function practiceMediaIsCached(
  urls: string[],
  cacheMap: Record<string, string>
): boolean {
  if (!urls.length) return true;
  return urls.every((remote) => {
    const local = cacheMap[remote];
    return Boolean(local && isLocalMediaUri(local));
  });
}

export function useStarCamPracticeItems(missionFlow: StarCamChildMissionStartPayload | null) {
  const cachedMediaUris = useStarCamStore((s) => s.cachedMediaUris);
  const setCachedMediaUris = useStarCamStore((s) => s.setCachedMediaUris);

  const practiceItems = missionFlow?.flow?.practice?.items ?? [];
  const practiceUrls = useMemo(
    () => collectStarCamPracticeMediaUrls(missionFlow),
    [missionFlow]
  );

  const [localCacheMap, setLocalCacheMap] = useState<Record<string, string>>({});
  const [isHydrating, setIsHydrating] = useState(false);
  const hydrateStartedRef = useRef(false);

  const cacheMap = useMemo(
    () => ({ ...cachedMediaUris, ...localCacheMap }),
    [cachedMediaUris, localCacheMap]
  );

  const items = useMemo(
    () => buildStarCamPracticeSequenceItems(practiceItems, cacheMap),
    [practiceItems, cacheMap]
  );

  const isCacheComplete = useMemo(
    () => practiceMediaIsCached(practiceUrls, cacheMap),
    [practiceUrls, cacheMap]
  );

  useEffect(() => {
    hydrateStartedRef.current = false;
  }, [missionFlow?.mission?.missionId]);

  useEffect(() => {
    if (!missionFlow || isCacheComplete || !practiceUrls.length || hydrateStartedRef.current) return;

    hydrateStartedRef.current = true;
    let cancelled = false;
    setIsHydrating(true);

    void (async () => {
      try {
        await preloadMediaAssetsToCache(practiceUrls);
        const map = await snapshotCachedMediaUris(practiceUrls);
        if (cancelled) return;

        const merged = { ...useStarCamStore.getState().cachedMediaUris, ...map };
        setCachedMediaUris(merged);
        setLocalCacheMap((prev) => ({ ...prev, ...map }));
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [missionFlow, isCacheComplete, practiceUrls, setCachedMediaUris]);

  const isMediaReady = Boolean(missionFlow) && !isHydrating && (practiceItems.length === 0 || isCacheComplete);

  return { items, isMediaReady };
}
