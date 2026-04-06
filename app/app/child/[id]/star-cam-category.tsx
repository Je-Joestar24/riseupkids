import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';

import {
  STAR_CAM_CATEGORY_PRESETS,
  StarCamDynamicDisplay,
  type StarCamCategoryKey,
} from '@/components/child/starcamdynamicdisplay';

const VALID_KEYS = new Set(Object.keys(STAR_CAM_CATEGORY_PRESETS) as StarCamCategoryKey[]);

export default function StarCamCategoryScreen() {
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();
  const router = useRouter();
  const childId = id ?? null;

  const categoryKey = useMemo(() => {
    let raw = (category || '').toLowerCase();
    if (raw === 'adventure') raw = 'nature';
    return VALID_KEYS.has(raw as StarCamCategoryKey) ? (raw as StarCamCategoryKey) : 'reading';
  }, [category]);

  const onBack = () => {
    if (!id) {
      router.back();
      return;
    }
    router.replace(`/child/${id}/star-cam` as never);
  };

  return <StarCamDynamicDisplay categoryKey={categoryKey} childId={childId} onBack={onBack} />;
}
