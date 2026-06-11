import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarCamMissionPreloadOverlay } from '@/components/child/starcam/StarCamMissionPreloadOverlay';
import { colors } from '@/config/theme/colors';
import { useStarCamCategoryMissions } from '@/hooks/starCamHook';
import { useStarCamMissionPreload } from '@/hooks/useStarCamMissionPreload';

import { STAR_CAM_CATEGORY_PRESETS } from './categoryPresets';
import { StarCamCategoryMissionMap } from './StarCamCategoryMissionMap';
import type { StarCamDynamicDisplayProps, StarCamMapMissionItem } from './types';

export function StarCamDynamicDisplay({
  categoryKey,
  childId,
  onBack,
  onMissionPress,
}: StarCamDynamicDisplayProps) {
  const preset = STAR_CAM_CATEGORY_PRESETS[categoryKey];
  const { mapBubbles } = useStarCamCategoryMissions(childId, categoryKey, preset.missionEmojiCycle);
  const { isPreloading, progress, error, failedCount, preloadMission, clearError } =
    useStarCamMissionPreload(childId);
  const [pendingMission, setPendingMission] = useState<StarCamMapMissionItem | null>(null);

  const displayMissions = useMemo(
    () => (mapBubbles.length > 0 ? mapBubbles : preset.sampleMissions),
    [mapBubbles, preset.sampleMissions]
  );

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
      setPendingMission(null);

      if (result?.flow) {
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
          onBack={onBack}
          missions={displayMissions}
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
        onDismiss={clearError}
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
