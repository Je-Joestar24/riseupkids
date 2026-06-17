import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { StarCamPracticeModeScreen } from '@/components/child/starcampracticemode';
import { getStarCamCategoryPreset } from '@/components/child/starcamdynamicdisplay';
import { colors } from '@/config/theme/colors';
import { useStarCam } from '@/hooks/starCamHook';
import { useStarCamPracticeItems } from '@/hooks/useStarCamPracticeItems';

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

  const { missionFlow } = useStarCam();
  const { items, isMediaReady } = useStarCamPracticeItems(missionFlow);

  const categoryPreset = useMemo(() => getStarCamCategoryPreset(categoryKey), [categoryKey]);

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

  if (!missionFlow || !isMediaReady) {
    return (
      <View style={styles.boot} accessibilityLabel="Preparing practice media">
        <ActivityIndicator size="large" color={categoryPreset.borderColor} />
      </View>
    );
  }

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

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSecondary,
  },
});
