import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback } from 'react';

import { ChildStarCam } from '@/components/child/starcam';

export default function ChildStarCamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const childId = id ?? null;

  const onSelectCategory = useCallback(
    (categoryKey: string) => {
      if (!id) return;
      const key = categoryKey === 'adventure' ? 'nature' : categoryKey;
      if (key === 'reading') {
        router.push(`/child/${id}/star-cam-reading` as never);
        return;
      }
      const mapKeys = new Set(['recipes', 'nature', 'sing', 'school']);
      if (mapKeys.has(key)) {
        router.push(`/child/${id}/star-cam-category?category=${encodeURIComponent(key)}` as never);
      }
    },
    [id, router]
  );

  return <ChildStarCam childId={childId} onSelectCategory={onSelectCategory} />;
}
