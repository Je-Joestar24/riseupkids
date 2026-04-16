import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';

import { StarCamPracticeModeScreen } from '@/components/child/starcampracticemode';
import { STAR_CAM_CATEGORY_PRESETS, type StarCamCategoryKey } from '@/components/child/starcamdynamicdisplay';
import { BACKEND_ORIGIN } from '@/config';
import { useStarCam } from '@/hooks/starCamHook';
import type { StarCamPracticeSequenceItem } from '@/hooks/useStarCamPracticeSequence';

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const safePath = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_ORIGIN}${safePath}`;
}

function formatDisplayLabel(value: string | null | undefined): string {
  const cleaned = String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.toUpperCase() : 'OBJECT';
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

  const { missionFlow, loadMissionFlow } = useStarCam();

  useEffect(() => {
    if (!childId || !missionSlug) return;
    void loadMissionFlow(childId, missionSlug);
  }, [childId, missionSlug, loadMissionFlow]);

  const categoryPreset = useMemo(() => {
    const safeKey = (categoryKey in STAR_CAM_CATEGORY_PRESETS ? categoryKey : 'reading') as StarCamCategoryKey;
    return STAR_CAM_CATEGORY_PRESETS[safeKey];
  }, [categoryKey]);

  const items: StarCamPracticeSequenceItem[] = useMemo(() => {
    const list = missionFlow?.flow?.practice?.items ?? [];
    return list
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((it) => ({
        targetLabel: formatDisplayLabel(it.displayText || it.target || 'object'),
        pronunciationVideoUrl: resolveImageUrl(it.pronunciationVideoUrl),
        sampleImageUrl: resolveImageUrl(it.imageUrl),
      }));
  }, [missionFlow]);

  const onBack = () => {
    if (!id) {
      router.back();
      return;
    }
    router.replace(
      `/child/${id}/star-cam-mission-start?category=${encodeURIComponent(categoryKey)}&missionId=${encodeURIComponent(missionSlug || '')}&title=${encodeURIComponent(title || '')}&imageUrl=${encodeURIComponent(imageUrl || '')}` as never
    );
  };

  const onComplete = () => {
    if (!id) return;
    router.replace(
      `/child/${id}/star-cam-mission-cam?category=${encodeURIComponent(categoryKey)}&missionId=${encodeURIComponent(missionSlug || '')}` as never
    );
  };

  return (
    <StarCamPracticeModeScreen
      title="Let's practice"
      items={items}
      gradientColors={categoryPreset.gradient}
      borderColor={categoryPreset.borderColor}
      accentColor={categoryPreset.borderColor}
      onBack={onBack}
      onComplete={onComplete}
    />
  );
}
