import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { StarCamPracticeModeScreen } from '@/components/child/starcampracticemode';
import { getStarCamCategoryPreset } from '@/components/child/starcamdynamicdisplay';
import { colors } from '@/config/theme/colors';
import { useStarCam } from '@/hooks/starCamHook';
import { useStarCamPracticeItems } from '@/hooks/useStarCamPracticeItems';
import { starCamMissionKeysMatch } from '@/services/starCamMissionMedia';

export default function StarCamPracticeModeRoute() {
  const { id, category, missionId, title, imageUrl } = useLocalSearchParams<{
    id: string;
    category?: string;
    missionId?: string;
    title?: string;
    imageUrl?: string;
  }>();
  const router = useRouter();
  const isFocused = useIsFocused();

  const childId = id ?? null;
  const missionSlug = missionId ?? null;
  const categoryKey = (category || 'reading').toLowerCase();

  const { missionFlow, loadMissionFlow, isLoadingMissionFlow } = useStarCam();
  const { items, isMediaReady } = useStarCamPracticeItems(missionFlow, missionSlug);

  useEffect(() => {
    if (!isFocused || !childId || !missionSlug) return;
    if (starCamMissionKeysMatch(missionSlug, missionFlow)) return;
    void loadMissionFlow(childId, missionSlug);
  }, [isFocused, childId, missionSlug, missionFlow, loadMissionFlow]);

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

  if (!missionFlow || !isMediaReady || isLoadingMissionFlow) {
    return (
      <View style={styles.boot} accessibilityLabel="Preparing practice media">
        <ActivityIndicator size="large" color={categoryPreset.borderColor} />
      </View>
    );
  }

  return (
    <StarCamPracticeModeScreen
      key={missionSlug || 'practice'}
      title="Let's practice"
      items={items}
      childId={childId}
      missionId={missionSlug}
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
