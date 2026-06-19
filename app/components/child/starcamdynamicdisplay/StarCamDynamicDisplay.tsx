import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarCamMissionPreloadOverlay } from '@/components/child/starcam/StarCamMissionPreloadOverlay';
import { colors } from '@/config/theme/colors';
import { useStarCamCategoryMissions } from '@/hooks/starCamHook';
import { useStarCamMissionPreload } from '@/hooks/useStarCamMissionPreload';

import { getStarCamCategoryPreset } from './categoryDisplay';
import { StarCamCategoryMissionMap } from './StarCamCategoryMissionMap';
import type { StarCamDynamicDisplayProps, StarCamMapMissionItem } from './types';

export function StarCamDynamicDisplay({
  categoryKey,
  childId,
  onBack,
  onMissionPress,
}: StarCamDynamicDisplayProps) {
  const preset = getStarCamCategoryPreset(categoryKey);
  const { mapBubbles, isLoadingMissions } = useStarCamCategoryMissions(
    childId,
    categoryKey,
    preset.missionEmojiCycle
  );
  const {
    isPreloading,
    progress,
    error,
    failedCount,
    preparingMissionId,
    preloadMission,
    clearError,
    cancelPreload,
  } = useStarCamMissionPreload(childId);
  const [pendingMission, setPendingMission] = useState<StarCamMapMissionItem | null>(null);

  const handleBack = useCallback(() => {
    cancelPreload();
    onBack();
  }, [cancelPreload, onBack]);

  const handleDismissError = useCallback(() => {
    cancelPreload();
    clearError();
    setPendingMission(null);
  }, [cancelPreload, clearError]);

  const handleMission = useCallback(
    async (item: StarCamMapMissionItem) => {
      if (isPreloading) return;

      const isSample = item.missionId.startsWith('sample-');
      if (isSample) {
        onMissionPress?.(item);
        return;
      }
      if (!childId) return;

      clearError();
      setPendingMission(item);

      const result = await preloadMission(item.missionId);

      if (result?.flow) {
        setPendingMission(null);
        onMissionPress?.(item);
      }
    },
    [onMissionPress, childId, preloadMission, clearError, isPreloading]
  );

  return (
    <SafeAreaView style={screenStyles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={screenStyles.pad}>
        <StarCamCategoryMissionMap
          preset={preset}
          onBack={handleBack}
          missions={mapBubbles}
          isLoadingMissions={isLoadingMissions}
          preparingMissionId={preparingMissionId}
          onMissionPress={handleMission}
        />
      </View>
      <StarCamMissionPreloadOverlay
        visible={isPreloading || Boolean(error)}
        progress={progress}
        missionTitle={pendingMission?.title}
        gradientColors={preset.gradient}
        borderColor={preset.borderColor}
        failedCount={failedCount}
        errorMessage={error}
        onDismiss={handleDismissError}
      />
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  pad: {
    flex: 1,
  },
});

export default StarCamDynamicDisplay;
