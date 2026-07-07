import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useMemo } from 'react';

import { StarCamMissionStartScreen } from '@/components/child/starcammissionstart';
import { getStarCamCategoryDisplayLabel, getStarCamCategoryPreset } from '@/components/child/starcamdynamicdisplay';
import { useStarCam } from '@/hooks/starCamHook';
import { resolveStarCamPlayableUrl, getStarCamScopedMediaCache, starCamCacheKeysMatch, starCamMissionKeysMatch } from '@/services/starCamMissionMedia';
import { getStarCamMissionIntroAudioAssetKey } from '@/services/starCamMissionIntroAudio';
import { useStarCamStore } from '@/store/starCamStore';

export default function StarCamMissionStartRoute() {
  const { id, category, missionId, title, imageUrl } = useLocalSearchParams<{
    imageUrl?: string;
    id: string;
    category?: string;
    missionId?: string;
    title?: string;
  }>();
  const router = useRouter();
  const isFocused = useIsFocused();
  const childId = id ?? null;
  const missionSlug = missionId ?? null;
  const categoryKey = (category || 'reading').toLowerCase();

  const { missionFlow, isLoadingMissionFlow, loadMissionFlow } = useStarCam();
  const cachedMissionId = useStarCamStore((s) => s.cachedMissionId);
  const cachedMediaUris = useStarCamStore((s) => s.cachedMediaUris);

  const scopedMediaCache = useMemo(
    () => getStarCamScopedMediaCache(missionSlug, cachedMissionId, cachedMediaUris, missionFlow),
    [missionSlug, cachedMissionId, cachedMediaUris, missionFlow]
  );

  useEffect(() => {
    if (!isFocused || !childId || !missionSlug) return;
    if (starCamMissionKeysMatch(missionSlug, missionFlow)) return;
    void loadMissionFlow(childId, missionSlug);
  }, [isFocused, childId, missionSlug, missionFlow, loadMissionFlow]);

  const startFlow = missionFlow?.flow?.start;

  const missionTitle = useMemo(
    () => missionFlow?.mission?.title || title || 'Mission',
    [missionFlow?.mission?.title, title]
  );
  const categoryHuntTitle = useMemo(() => {
    const label = missionFlow?.mission?.category
      ? getStarCamCategoryDisplayLabel(missionFlow.mission.category)
      : getStarCamCategoryDisplayLabel(categoryKey);
    return `${label} Hunt`;
  }, [missionFlow?.mission?.category, categoryKey]);
  const introText = startFlow?.introText || 'Get ready for your mission!';

  const introImageUrl = useMemo(
    () =>
      resolveStarCamPlayableUrl(
        startFlow?.missionImageUrl ?? startFlow?.introImageUrl ?? imageUrl ?? null,
        scopedMediaCache
      ),
    [startFlow?.missionImageUrl, startFlow?.introImageUrl, imageUrl, scopedMediaCache]
  );

  const introVideoUrl = useMemo(
    () => resolveStarCamPlayableUrl(startFlow?.shortVideoUrl, scopedMediaCache),
    [startFlow?.shortVideoUrl, scopedMediaCache]
  );

  const introAudioUrl = useMemo(
    () => resolveStarCamPlayableUrl(startFlow?.introAudioUrl, scopedMediaCache),
    [startFlow?.introAudioUrl, scopedMediaCache]
  );

  const introAudioAssetKey = useMemo(
    () => getStarCamMissionIntroAudioAssetKey(startFlow?.introAudioUrl),
    [startFlow?.introAudioUrl]
  );

  const categoryPreset = useMemo(() => getStarCamCategoryPreset(categoryKey), [categoryKey]);

  const isFlowReady = starCamMissionKeysMatch(missionSlug, missionFlow);
  const isCacheReady = starCamCacheKeysMatch(cachedMissionId, missionSlug, missionFlow);
  const isMediaReady = isFlowReady && isCacheReady;
  const isBooting = (isLoadingMissionFlow && !missionFlow) || (Boolean(missionFlow) && !isMediaReady);

  const onBack = () => {
    if (!id) {
      router.back();
      return;
    }
    router.replace(`/child/${id}/star-cam-category?category=${encodeURIComponent(categoryKey)}` as never);
  };

  const onStartMission = () => {
    if (!id) return;
    router.push(
      `/child/${id}/star-cam-practice-mode?category=${encodeURIComponent(categoryKey)}&missionId=${encodeURIComponent(missionSlug || '')}&title=${encodeURIComponent(missionTitle)}&imageUrl=${encodeURIComponent(introImageUrl || '')}` as never
    );
  };

  return (
    <StarCamMissionStartScreen
      categoryHuntTitle={categoryHuntTitle}
      missionTitle={missionTitle}
      introText={introText}
      introImageUrl={introImageUrl}
      introVideoUrl={introVideoUrl}
      introAudioUrl={introAudioUrl}
      introAudioAssetKey={introAudioAssetKey}
      gradientColors={categoryPreset.gradient}
      borderColor={categoryPreset.borderColor}
      accentColor={categoryPreset.borderColor}
      loading={isBooting}
      mediaReady={isMediaReady}
      onBack={onBack}
      onStartMission={onStartMission}
    />
  );
}
