import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';

import { StarCamMissionStartScreen } from '@/components/child/starcammissionstart';
import { STAR_CAM_CATEGORY_PRESETS, type StarCamCategoryKey } from '@/components/child/starcamdynamicdisplay';
import { BACKEND_ORIGIN } from '@/config';
import { useStarCam } from '@/hooks/starCamHook';

function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const safePath = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_ORIGIN}${safePath}`;
}

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

  const cachedMissionSlug = missionFlow?.mission?.missionId ?? null;

  useEffect(() => {
    if (!childId || !missionSlug) return;
    if (cachedMissionSlug === missionSlug) return;
    void loadMissionFlow(childId, missionSlug);
  }, [childId, missionSlug, loadMissionFlow, cachedMissionSlug]);

  const missionTitle = useMemo(
    () => missionFlow?.mission?.title || title || 'Mission',
    [missionFlow?.mission?.title, title]
  );
  const categoryHuntTitle = useMemo(() => {
    const categoryName = missionFlow?.mission?.category?.name || categoryKey;
    const pretty = String(categoryName || 'Category')
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return `${pretty} Hunt`;
  }, [missionFlow?.mission?.category?.name, categoryKey]);
  const introText = missionFlow?.flow?.start?.introText || 'Get ready for your mission!';
  const introImageUrl = missionFlow?.flow?.start?.introImageUrl || imageUrl || null;
  const introVideoUrl = resolveMediaUrl(missionFlow?.flow?.start?.shortVideoUrl);
  const categoryPreset = useMemo(() => {
    const safeKey = (categoryKey in STAR_CAM_CATEGORY_PRESETS ? categoryKey : 'reading') as StarCamCategoryKey;
    return STAR_CAM_CATEGORY_PRESETS[safeKey];
  }, [categoryKey]);

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
      gradientColors={categoryPreset.gradient}
      borderColor={categoryPreset.borderColor}
      accentColor={categoryPreset.borderColor}
      loading={isLoadingMissionFlow}
      onBack={onBack}
      onStartMission={onStartMission}
    />
  );
}
