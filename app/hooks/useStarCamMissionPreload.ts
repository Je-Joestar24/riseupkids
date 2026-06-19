import { useCallback, useRef, useState } from 'react';

import type { StarCamChildMissionStartPayload } from '@/services/childStarCamService';
import {
  ensureStarCamMissionIntroAudio,
  getStarCamMissionIntroAudioAssetKey,
  stopStarCamMissionIntroAudio,
} from '@/services/starCamMissionIntroAudio';
import { collectStarCamMissionMediaUrls, resolveStarCamMediaUrl } from '@/services/starCamMissionMedia';
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
  preparingMissionId: string | null;
  preloadMission: (missionId: string) => Promise<StarCamMissionPreloadResult | null>;
  clearError: () => void;
  cancelPreload: () => void;
}

export function useStarCamMissionPreload(childId: string | null): UseStarCamMissionPreloadReturn {
  const fetchMissionStartFlow = useStarCamStore((s) => s.fetchMissionStartFlow);
  const mergeCachedMediaUris = useStarCamStore((s) => s.mergeCachedMediaUris);

  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const [preparingMissionId, setPreparingMissionId] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const clearError = useCallback(() => setError(null), []);

  const cancelPreload = useCallback(() => {
    runIdRef.current += 1;
    setIsPreloading(false);
    setPreparingMissionId(null);
    setProgress(0);
    setError(null);
    setFailedCount(0);
    void stopStarCamMissionIntroAudio();
  }, []);

  const preloadMission = useCallback(
    async (missionId: string): Promise<StarCamMissionPreloadResult | null> => {
      if (!childId || !missionId) return null;

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      setIsPreloading(true);
      setPreparingMissionId(missionId);
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

        const introAssetKey = getStarCamMissionIntroAudioAssetKey(flow.flow?.start?.introAudioUrl);
        const introPlayableUri = resolveStarCamMediaUrl(flow.flow?.start?.introAudioUrl);
        if (introAssetKey && introPlayableUri) {
          void ensureStarCamMissionIntroAudio(introPlayableUri, introAssetKey);
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
          setPreparingMissionId(null);
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
    preparingMissionId,
    preloadMission,
    clearError,
    cancelPreload,
  };
}
