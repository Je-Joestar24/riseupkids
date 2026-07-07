import { useCallback, useRef, useState } from 'react';

import type { StarCamChildMissionStartPayload, StarCamMediaAssetRef } from '@/services/childStarCamService';
import { normalizeStarCamMissionKey, collectStarCamMissionMediaUrls } from '@/services/starCamMissionMedia';
import { preloadStarCamManifestAssets } from '@/services/starCamMediaCache';
import { stopStarCamMissionIntroAudio } from '@/services/starCamMissionIntroAudio';
import {
  assetNeedsDownload,
  getMissionPackAssetPath,
  resolveManifestAssets,
  saveMissionPack,
  tryRestoreMissionPack,
} from '@/services/starCamMissionPackStorage';
import { useStarCamStore } from '@/store/starCamStore';

export interface StarCamMissionPreloadResult {
  flow: StarCamChildMissionStartPayload;
  failedCount: number;
  restoredFromPack: boolean;
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

function buildManifestAssets(flow: StarCamChildMissionStartPayload): StarCamMediaAssetRef[] {
  const fromManifest = resolveManifestAssets(flow.mediaManifest);
  if (fromManifest.length) return fromManifest;

  return collectStarCamMissionMediaUrls(flow).map((url, index) => ({
    key: `legacy.asset[${String(index + 1).padStart(2, '0')}]`,
    mediaId: null,
    url,
    updatedAt: flow.mission.contentVersion ?? null,
    kind: null,
  }));
}

export function useStarCamMissionPreload(childId: string | null): UseStarCamMissionPreloadReturn {
  const fetchMissionStartFlow = useStarCamStore((s) => s.fetchMissionStartFlow);
  const commitPreloadedMission = useStarCamStore((s) => s.commitPreloadedMission);
  const cancelMissionFlowRequest = useStarCamStore((s) => s.cancelMissionFlowRequest);

  const [isPreloading, setIsPreloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const [preparingMissionId, setPreparingMissionId] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const clearError = useCallback(() => setError(null), []);

  const cancelPreload = useCallback(() => {
    runIdRef.current += 1;
    cancelMissionFlowRequest();
    setIsPreloading(false);
    setPreparingMissionId(null);
    setProgress(0);
    setError(null);
    setFailedCount(0);
    void stopStarCamMissionIntroAudio();
  }, [cancelMissionFlowRequest]);

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
      void stopStarCamMissionIntroAudio();

      try {
        const routeMissionKey = normalizeStarCamMissionKey(missionId);
        const flow = await fetchMissionStartFlow(childId, missionId);
        if (runIdRef.current !== runId) return null;

        if (!flow) {
          setError('Could not load this mission. Check your connection and try again.');
          return null;
        }

        const contentVersion = flow.mission.contentVersion ?? flow.mediaManifest?.contentVersion ?? null;
        const manifestAssets = buildManifestAssets(flow);

        const restored = await tryRestoreMissionPack(routeMissionKey, contentVersion);
        if (runIdRef.current !== runId) return null;

        if (restored?.uriMap && Object.keys(restored.uriMap).length) {
          commitPreloadedMission(missionId, flow, restored.uriMap);
          setProgress(100);
          setFailedCount(0);
          return { flow, failedCount: 0, restoredFromPack: true };
        }

        const preloadResult = await preloadStarCamManifestAssets(manifestAssets, routeMissionKey, {
          seedUriMap: restored?.uriMap ?? {},
          onProgress: (pct) => {
            if (runIdRef.current === runId) setProgress(pct);
          },
          concurrency: 3,
          resolveDest: (asset, remoteUrl) => getMissionPackAssetPath(routeMissionKey, asset.key, remoteUrl),
          shouldDownload: (asset) => assetNeedsDownload(asset, restored?.manifest ?? null),
        });

        if (runIdRef.current !== runId) return null;

        await saveMissionPack({
          missionId: routeMissionKey,
          contentVersion,
          assets: manifestAssets,
          uriMap: preloadResult.uriMap,
        });

        commitPreloadedMission(missionId, flow, preloadResult.uriMap);
        setFailedCount(preloadResult.failed.length);
        setProgress(100);

        return {
          flow,
          failedCount: preloadResult.failed.length,
          restoredFromPack: false,
        };
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
    [childId, fetchMissionStartFlow, commitPreloadedMission]
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
