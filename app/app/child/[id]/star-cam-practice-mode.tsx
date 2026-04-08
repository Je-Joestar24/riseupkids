import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';

import { StarCamPracticeModeScreen } from '@/components/child/starcampracticemode';
import { STAR_CAM_CATEGORY_PRESETS, type StarCamCategoryKey } from '@/components/child/starcamdynamicdisplay';
import { BACKEND_ORIGIN } from '@/config';
import { useStarCam } from '@/hooks/starCamHook';

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const safePath = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_ORIGIN}${safePath}`;
}

export default function StarCamPracticeModeRoute() {
  const { id, category, missionId, title, imageUrl } = useLocalSearchParams<{
    id: string;
    category?: string;
    missionId?: string;
    title?: string;
    imageUrl?: string;
  }>();
  const router = useRouter();

  const childId = id ?? null;
  const missionSlug = missionId ?? null;
  const categoryKey = (category || 'reading').toLowerCase();

  const { practiceMaterial, loadPracticeMaterial } = useStarCam();

  useEffect(() => {
    if (!childId || !missionSlug) return;
    void loadPracticeMaterial(childId, missionSlug, 6);
  }, [childId, missionSlug, loadPracticeMaterial]);

  const categoryPreset = useMemo(() => {
    const safeKey = (categoryKey in STAR_CAM_CATEGORY_PRESETS ? categoryKey : 'reading') as StarCamCategoryKey;
    return STAR_CAM_CATEGORY_PRESETS[safeKey];
  }, [categoryKey]);

  const practiceItem = practiceMaterial?.item ?? null;
  const targetLabel = practiceItem?.target || practiceItem?.displayText || '...';
  const pronunciationVideo = resolveImageUrl(practiceItem?.pronunciationVideoUrl);
  const sampleImage = resolveImageUrl(practiceItem?.imageUrl);

  const onBack = () => {
    if (!id) {
      router.back();
      return;
    }
    router.replace(
      `/child/${id}/star-cam-mission-start?category=${encodeURIComponent(categoryKey)}&missionId=${encodeURIComponent(missionSlug || '')}&title=${encodeURIComponent(title || '')}&imageUrl=${encodeURIComponent(imageUrl || '')}` as never
    );
  };

  const onContinue = () => {
    if (!id) return;
    router.push(
      `/child/${id}/star-cam-mission-cam?category=${encodeURIComponent(categoryKey)}&missionId=${encodeURIComponent(missionSlug || '')}` as never
    );
  };

  return (
    <StarCamPracticeModeScreen
      title="Let's practice"
      targetLabel={targetLabel}
      pronunciationVideoUrl={pronunciationVideo}
      sampleImageUrl={sampleImage}
      gradientColors={categoryPreset.gradient}
      borderColor={categoryPreset.borderColor}
      accentColor={categoryPreset.borderColor}
      onBack={onBack}
      onContinue={onContinue}
    />
  );
}
