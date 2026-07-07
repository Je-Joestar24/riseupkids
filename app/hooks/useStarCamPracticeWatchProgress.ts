import { useCallback, useEffect, useState } from 'react';

import {
  isPracticeItemWatched,
  loadWatchedPracticeItemKeys,
  markPracticeItemWatched,
} from '@/services/starCamPracticeWatchStorage';

export interface UseStarCamPracticeWatchProgressParams {
  childId: string | null | undefined;
  missionId: string | null | undefined;
}

export interface UseStarCamPracticeWatchProgressResult {
  watchedKeys: Set<string>;
  isLoaded: boolean;
  isItemWatched: (itemKey: string | null | undefined) => boolean;
  markItemWatched: (itemKey: string | null | undefined) => Promise<void>;
}

export function useStarCamPracticeWatchProgress({
  childId,
  missionId,
}: UseStarCamPracticeWatchProgressParams): UseStarCamPracticeWatchProgressResult {
  const [watchedKeys, setWatchedKeys] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoaded(false);
    void loadWatchedPracticeItemKeys(childId, missionId).then((keys) => {
      if (cancelled) return;
      setWatchedKeys(keys);
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [childId, missionId]);

  const isItemWatched = useCallback(
    (itemKey: string | null | undefined) => isPracticeItemWatched(watchedKeys, itemKey),
    [watchedKeys]
  );

  const markItemWatched = useCallback(
    async (itemKey: string | null | undefined) => {
      if (!itemKey) return;
      const next = await markPracticeItemWatched(childId, missionId, itemKey);
      setWatchedKeys(next);
    },
    [childId, missionId]
  );

  return {
    watchedKeys,
    isLoaded,
    isItemWatched,
    markItemWatched,
  };
}
