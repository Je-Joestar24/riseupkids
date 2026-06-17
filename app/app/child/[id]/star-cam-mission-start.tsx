import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';

import { StarCamMissionStartScreen } from '@/components/child/starcammissionstart';
import { getStarCamCategoryDisplayLabel, getStarCamCategoryPreset } from '@/components/child/starcamdynamicdisplay';
import { useStarCam } from '@/hooks/starCamHook';
import { resolveStarCamPlayableUrl } from '@/services/starCamMissionMedia';
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
  const childId = id ?? null;
  const missionSlug = missionId ?? null;
  const categoryKey = (category || 'reading').toLowerCase();

  const { missionFlow, isLoadingMissionFlow, loadMissionFlow } = useStarCam();
  const cachedMediaUris = useStarCamStore((s) => s.cachedMediaUris);

  const cachedMissionSlug = missionFlow?.mission?.missionId ?? null;

  useEffect(() => {
    if (!childId || !missionSlug) return;
    if (cachedMissionSlug === missionSlug) return;
    void loadMissionFlow(childId, missionSlug);
  }, [childId, missionSlug, loadMissionFlow, cachedMissionSlug]);

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
        cachedMediaUris
      ),
    [startFlow?.missionImageUrl, startFlow?.introImageUrl, imageUrl, cachedMediaUris]
  );

  const introVideoUrl = useMemo(
    () => resolveStarCamPlayableUrl(startFlow?.shortVideoUrl, cachedMediaUris),
    [startFlow?.shortVideoUrl, cachedMediaUris]
  );

  const introAudioUrl = useMemo(
    () => resolveStarCamPlayableUrl(startFlow?.introAudioUrl, cachedMediaUris),
    [startFlow?.introAudioUrl, cachedMediaUris]
  );

  const categoryPreset = useMemo(() => getStarCamCategoryPreset(categoryKey), [categoryKey]);

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
      gradientColors={categoryPreset.gradient}
      borderColor={categoryPreset.borderColor}
      accentColor={categoryPreset.borderColor}
      loading={isLoadingMissionFlow && !missionFlow}
      onBack={onBack}
      onStartMission={onStartMission}
    />
  );
}
