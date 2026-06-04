import { useCallback, useRef, useState } from 'react';

import {
  type PreloadSummary,
  preloadMediaAssetsToCache,
  snapshotCachedMediaUris,
} from '@/components/child/common/cms-player-media';
import type { StarCamChildMissionStartPayload } from '@/services/childStarCamService';
import { collectStarCamMissionMediaUrls } from '@/services/starCamMissionMedia';
import { useStarCamStore } from '@/store/starCamStore';

import { usePerceivedLoadProgress } from './usePerceivedLoadProgress';

const COMPLETE_DWELL_MS = 320;

export interface UseStarCamMissionPreloadReturn {
  isPreloading: boolean;
  displayProgress: number;
  realProgress: number;
  error: string | null;
  preloadSummary: PreloadSummary | null;
  /** Fetch mission flow + cache all media; returns flow when ready. */
  preloadMission: (missionId: string) => Promise<StarCamChildMissionStartPayload | null>;
  reset: () => void;
}

export function useStarCamMissionPreload(childId: string | null): UseStarCamMissionPreloadReturn {
  const fetchMissionStartFlow = useStarCamStore((s) => s.fetchMissionStartFlow);
  const setCachedMediaUris = useStarCamStore((s) => s.setCachedMediaUris);

  const [isPreloading, setIsPreloading] = useState(false);
  const [realProgress, setRealProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preloadSummary, setPreloadSummary] = useState<PreloadSummary | null>(null);
  const runIdRef = useRef(0);

  const displayProgress = usePerceivedLoadProgress(realProgress, isPreloading);

  const reset = useCallback(() => {
    setIsPreloading(false);
    setRealProgress(0);
    setError(null);
    setPreloadSummary(null);
  }, []);

  const preloadMission = useCallback(
    async (missionId: string): Promise<StarCamChildMissionStartPayload | null> => {
      if (!childId || !missionId) return null;

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      setIsPreloading(true);
      setRealProgress(0);
      setError(null);
      setPreloadSummary(null);

      try {
        const flow = await fetchMissionStartFlow(childId, missionId);
        if (runIdRef.current !== runId) return null;

        if (!flow) {
          setError('Could not load this mission. Please try again.');
          setIsPreloading(false);
          return null;
        }

        const urls = collectStarCamMissionMediaUrls(flow);
        const summary = urls.length
          ? await preloadMediaAssetsToCache(
              urls,
              (pct) => {
                if (runIdRef.current === runId) setRealProgress(pct);
              },
              6
            )
          : { failed: [] as string[] };
        if (!urls.length && runIdRef.current === runId) {
          setRealProgress(100);
        }

        if (runIdRef.current !== runId) return null;

        const uriMap = urls.length ? await snapshotCachedMediaUris(urls) : {};
        if (runIdRef.current === runId) {
          setCachedMediaUris(uriMap);
        }

        setRealProgress(100);
        setPreloadSummary(summary);
        await new Promise((resolve) => setTimeout(resolve, COMPLETE_DWELL_MS));

        if (runIdRef.current !== runId) return null;
        return flow;
      } catch (err) {
        if (runIdRef.current !== runId) return null;
        const msg = err instanceof Error ? err.message : 'Failed to prepare mission media';
        setError(msg);
        return null;
      } finally {
        if (runIdRef.current === runId) {
          setIsPreloading(false);
        }
      }
    },
    [childId, fetchMissionStartFlow, setCachedMediaUris]
  );

  return {
    isPreloading,
    displayProgress,
    realProgress,
    error,
    preloadSummary,
    preloadMission,
    reset,
  };
}
