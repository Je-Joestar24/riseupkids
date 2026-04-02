import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { StarCamReading } from '@/components/parents/child/star-cam-reading';

export default function StarCamReadingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const childId = id ?? null;

  const onBack = () => {
    if (!id) {
      router.back();
      return;
    }
    router.replace(`/child/${id}/star-cam` as never);
  };

  return <StarCamReading childId={childId} onBack={onBack} />;
}
