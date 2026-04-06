import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/config/theme/colors';
import { useStarCamCategoryMissions } from '@/hooks/starCamHook';

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
  const { mapBubbles, selectMissionForFlow } = useStarCamCategoryMissions(
    childId,
    categoryKey,
    preset.missionEmojiCycle
  );

  const displayMissions = useMemo(
    () => (mapBubbles.length > 0 ? mapBubbles : preset.sampleMissions),
    [mapBubbles, preset.sampleMissions]
  );

  const handleMission = useCallback(
    async (item: StarCamMapMissionItem) => {
      const isSample = item.missionId.startsWith('sample-');
      if (!isSample && childId) {
        await selectMissionForFlow(item.missionId);
      }
      onMissionPress?.(item);
    },
    [onMissionPress, selectMissionForFlow, childId]
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
