import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback } from 'react';

import ChildStarCam from '@/components/parents/child/child-star-cam';

export default function ChildStarCamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const childId = id ?? null;

  const onSelectCategory = useCallback(
    (categoryKey: string) => {
      if (!id) return;
      if (categoryKey === 'reading') {
        router.push(`/child/${id}/star-cam-reading` as never);
      }
    },
    [id, router]
  );

  return <ChildStarCam childId={childId} onSelectCategory={onSelectCategory} />;
}
