import { useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';

import { StarCamPracticeModeScreen } from '@/components/child/starcampracticemode';
import { STAR_CAM_CATEGORY_PRESETS, type StarCamCategoryKey } from '@/components/child/starcamdynamicdisplay';
import { BACKEND_ORIGIN } from '@/config';
import { childStarCamService, type StarCamPracticeItem } from '@/services/childStarCamService';

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

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const childId = id ?? null;
  const missionSlug = missionId ?? null;
  const categoryKey = (category || 'reading').toLowerCase();
  const hasCameraPermission = cameraPermission?.granted === true;
  const isLoadingCameraPermission = !cameraPermission;

  const [practiceItem, setPracticeItem] = useState<StarCamPracticeItem | null>(null);

  useEffect(() => {
    if (!cameraPermission) {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  useEffect(() => {
    let active = true;
    if (!childId || !missionSlug) return;
    const loadPracticeMaterial = async () => {
      try {
        const res = await childStarCamService.getMissionPracticeMaterial(childId, missionSlug, 6);
        if (!active) return;
        setPracticeItem(res?.success ? res.data?.item ?? null : null);
      } catch {
        if (!active) return;
        setPracticeItem(null);
      }
    };
    void loadPracticeMaterial();
    return () => {
      active = false;
    };
  }, [childId, missionSlug]);

  const categoryPreset = useMemo(() => {
    const safeKey = (categoryKey in STAR_CAM_CATEGORY_PRESETS ? categoryKey : 'reading') as StarCamCategoryKey;
    return STAR_CAM_CATEGORY_PRESETS[safeKey];
  }, [categoryKey]);

  const targetLabel = practiceItem?.target || practiceItem?.displayText || '...';
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

  return (
    <StarCamPracticeModeScreen
      title="Let's practice"
      targetLabel={targetLabel}
      sampleImageUrl={sampleImage}
      gradientColors={categoryPreset.gradient}
      borderColor={categoryPreset.borderColor}
      accentColor={categoryPreset.borderColor}
      isLoadingCameraPermission={isLoadingCameraPermission}
      hasCameraPermission={hasCameraPermission}
      onBack={onBack}
      onRequestCameraPermission={() => {
        void requestCameraPermission();
      }}
    />
  );
}
