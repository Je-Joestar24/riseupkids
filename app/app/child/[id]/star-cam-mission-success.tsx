import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';

import { StarCamMissionSuccessScreen } from '@/components/child/starcammissionsuccess';
import { STAR_CAM_CATEGORY_PRESETS, type StarCamCategoryKey } from '@/components/child/starcamdynamicdisplay';
import { BACKEND_ORIGIN } from '@/config';
import { useStarCam } from '@/hooks/starCamHook';

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const safePath = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_ORIGIN}${safePath}`;
}

export default function StarCamMissionSuccessRoute() {
  const { id, category, missionId, title } = useLocalSearchParams<{
    id: string;
    category?: string;
    missionId?: string;
    title?: string;
  }>();
  const router = useRouter();

  const childId = id ?? null;
  const missionSlug = missionId ?? null;
  const categoryKey = (category || 'reading').toLowerCase();
  const { missionFlow, loadMissionFlow } = useStarCam();

  useEffect(() => {
    if (!childId || !missionSlug) return;
    void loadMissionFlow(childId, missionSlug);
  }, [childId, missionSlug, loadMissionFlow]);

  const categoryPreset = useMemo(() => {
    const safeKey = (categoryKey in STAR_CAM_CATEGORY_PRESETS ? categoryKey : 'reading') as StarCamCategoryKey;
    return STAR_CAM_CATEGORY_PRESETS[safeKey];
  }, [categoryKey]);

  const completion = missionFlow?.flow?.completion;
  const missionTitle = completion?.title || missionFlow?.mission?.title || title || 'Mission Complete';
  const subtitle = completion?.subtitle || 'You found all 7 objects!';
  const rewardAudioUrl = resolveMediaUrl(completion?.rewardAudioUrl);
  const rewardVideoUrl = resolveMediaUrl(completion?.rewardVideoUrl);

  const onGoToStarCam = () => {
    if (!id) return;
    router.replace(`/child/${id}/star-cam` as never);
  };

  const onTryAgain = () => {
    if (!id) return;
    router.replace(
      `/child/${id}/star-cam-mission-start?category=${encodeURIComponent(categoryKey)}&missionId=${encodeURIComponent(missionSlug || '')}&title=${encodeURIComponent(missionFlow?.mission?.title || '')}` as never
    );
  };

  return (
    <StarCamMissionSuccessScreen
      missionTitle={missionTitle}
      subtitle={subtitle}
      rewardAudioUrl={rewardAudioUrl}
      rewardVideoUrl={rewardVideoUrl}
      gradientColors={categoryPreset.gradient}
      borderColor={categoryPreset.borderColor}
      accentColor={categoryPreset.borderColor}
      onGoToStarCam={onGoToStarCam}
      onTryAgain={onTryAgain}
    />
  );
}
