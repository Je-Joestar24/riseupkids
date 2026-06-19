import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/config/theme/colors';
import { useStarCamCategoryMissions } from '@/hooks/starCamHook';
import { useStarCamMissionPreload } from '@/hooks/useStarCamMissionPreload';

import { getStarCamCategoryPreset } from './categoryDisplay';
import { StarCamCategoryMissionMap } from './StarCamCategoryMissionMap';
import { StarCamMapLoadErrorBanner } from './StarCamMapLoadErrorBanner';
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
  const { preparingMissionId, error, preloadMission, clearError, cancelPreload } =
    useStarCamMissionPreload(childId);

  const handleBack = useCallback(() => {
    cancelPreload();
    onBack();
  }, [cancelPreload, onBack]);

  const handleDismissError = useCallback(() => {
    clearError();
  }, [clearError]);

  const handleMission = useCallback(
    async (item: StarCamMapMissionItem) => {
      if (preparingMissionId) return;

      const isSample = item.missionId.startsWith('sample-');
      if (isSample) {
        onMissionPress?.(item);
        return;
      }
      if (!childId) return;

      clearError();

      const result = await preloadMission(item.missionId);

      if (result?.flow) {
        onMissionPress?.(item);
      }
    },
    [onMissionPress, childId, preloadMission, clearError, preparingMissionId]
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
      {error ? <StarCamMapLoadErrorBanner message={error} onDismiss={handleDismissError} /> : null}
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
