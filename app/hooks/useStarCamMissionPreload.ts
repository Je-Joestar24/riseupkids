import { useCallback, useRef, useState } from 'react';

import type { StarCamChildMissionStartPayload } from '@/services/childStarCamService';
import { collectStarCamMissionMediaUrls } from '@/services/starCamMissionMedia';
import { preloadStarCamMediaUrls } from '@/services/starCamMediaCache';
import { useStarCamStore } from '@/store/starCamStore';

export interface StarCamMissionPreloadResult {
  flow: StarCamChildMissionStartPayload;
  failedCount: number;
}

export interface UseStarCamMissionPreloadReturn {
  isPreloading: boolean;
  progress: number;
  error: string | null;
  failedCount: number;
  preloadMission: (missionId: string) => Promise<StarCamMissionPreloadResult | null>;
  clearError: () => void;
}

export function useStarCamMissionPreload(childId: string | null): UseStarCamMissionPreloadReturn {
  const fetchMissionStartFlow = useStarCamStore((s) => s.fetchMissionStartFlow);
  const mergeCachedMediaUris = useStarCamStore((s) => s.mergeCachedMediaUris);

  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const runIdRef = useRef(0);

  const clearError = useCallback(() => setError(null), []);

  const preloadMission = useCallback(
    async (missionId: string): Promise<StarCamMissionPreloadResult | null> => {
      if (!childId || !missionId) return null;

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      setIsPreloading(true);
      setProgress(0);
      setError(null);
      setFailedCount(0);

      try {
        const flow = await fetchMissionStartFlow(childId, missionId);
        if (runIdRef.current !== runId) return null;

        if (!flow) {
          setError('Could not load this mission. Check your connection and try again.');
          return null;
        }

        const urls = collectStarCamMissionMediaUrls(flow);
        let mediaFailed = 0;

        if (urls.length) {
          const { failed, uriMap } = await preloadStarCamMediaUrls(
            urls,
            (pct) => {
              if (runIdRef.current === runId) setProgress(pct);
            },
            3
          );
          mediaFailed = failed.length;
          if (runIdRef.current === runId) {
            mergeCachedMediaUris(uriMap);
            setFailedCount(mediaFailed);
            setProgress(100);
          }
        } else if (runIdRef.current === runId) {
          setProgress(100);
        }

        if (runIdRef.current !== runId) return null;

        return { flow, failedCount: mediaFailed };
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
    [childId, fetchMissionStartFlow, mergeCachedMediaUris]
  );

  return {
    isPreloading,
    progress,
    error,
    failedCount,
    preloadMission,
    clearError,
  };
}
