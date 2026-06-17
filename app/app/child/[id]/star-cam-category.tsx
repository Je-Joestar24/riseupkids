import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';

import { StarCamDynamicDisplay } from '@/components/child/starcamdynamicdisplay';

export default function StarCamCategoryScreen() {
  const { id, category } = useLocalSearchParams<{ id: string; category?: string }>();
  const router = useRouter();
  const childId = id ?? null;

  const categoryKey = useMemo(() => {
    const raw = String(category || 'reading')
      .trim()
      .toLowerCase();
    return raw || 'reading';
  }, [category]);

  const onBack = () => {
    if (!id) {
      router.back();
      return;
    }
    router.replace(`/child/${id}/star-cam` as never);
  };

  const onMissionPress = (item: { missionId: string; title: string; imageUrl?: string | null }) => {
    if (!id) return;
    router.push(
      `/child/${id}/star-cam-mission-start?category=${encodeURIComponent(categoryKey)}&missionId=${encodeURIComponent(item.missionId)}&title=${encodeURIComponent(item.title || '')}&imageUrl=${encodeURIComponent(item.imageUrl || '')}` as never
    );
  };

  return <StarCamDynamicDisplay categoryKey={categoryKey} childId={childId} onBack={onBack} onMissionPress={onMissionPress} />;
}
