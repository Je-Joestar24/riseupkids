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
  preparingMissionId: string | null;
  error: string | null;
  preloadMission: (missionId: string) => Promise<StarCamMissionPreloadResult | null>;
  clearError: () => void;
  cancelPreload: () => void;
}

export function useStarCamMissionPreload(childId: string | null): UseStarCamMissionPreloadReturn {
  const fetchMissionStartFlow = useStarCamStore((s) => s.fetchMissionStartFlow);
  const mergeCachedMediaUris = useStarCamStore((s) => s.mergeCachedMediaUris);

  const [preparingMissionId, setPreparingMissionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const clearError = useCallback(() => setError(null), []);

  const cancelPreload = useCallback(() => {
    runIdRef.current += 1;
    setPreparingMissionId(null);
    setError(null);
    void stopStarCamMissionIntroAudio();
  }, []);

  const preloadMediaInBackground = useCallback(
    async (flow: StarCamChildMissionStartPayload, runId: number) => {
      const urls = collectStarCamMissionMediaUrls(flow);
      if (!urls.length || runIdRef.current !== runId) return;

      try {
        const { uriMap } = await preloadStarCamMediaUrls(urls, undefined, 3);
        if (runIdRef.current === runId) {
          mergeCachedMediaUris(uriMap);
        }
      } catch {
        // Background cache — mission already opened; ignore failures.
      }
    },
    [mergeCachedMediaUris]
  );

  const preloadMission = useCallback(
    async (missionId: string): Promise<StarCamMissionPreloadResult | null> => {
      if (!childId || !missionId) return null;

      const runId = runIdRef.current + 1;
      runIdRef.current = runId;

      setPreparingMissionId(missionId);
      setError(null);

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

        void preloadMediaInBackground(flow, runId);

        return { flow, failedCount: 0 };
      } catch (err) {
        if (runIdRef.current !== runId) return null;
        const msg = err instanceof Error ? err.message : 'Failed to prepare mission media';
        setError(msg);
        return null;
      } finally {
        if (runIdRef.current === runId) {
          setPreparingMissionId(null);
        }
      }
    },
    [childId, fetchMissionStartFlow, preloadMediaInBackground]
  );

  return {
    preparingMissionId,
    error,
    preloadMission,
    clearError,
    cancelPreload,
  };
}
