import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

import type { MissionSlotTemplate } from './constants';
import { missionSlotsForPreset } from './missionSlots';
import { mapStyles } from './mapStyles';
import { StarCamCategoryHeaderTitle } from './StarCamCategoryHeaderTitle';
import { StarCamDecorEmoji } from './StarCamDecorEmoji';
import { StarCamMapBackButton } from './StarCamMapBackButton';
import { StarCamMapFooterHint } from './StarCamMapFooterHint';
import { StarCamMissionBubble } from './StarCamMissionBubble';
import type { StarCamCategoryPreset, StarCamMapMissionItem } from './types';
import { useStarCamMissionPath } from './useStarCamMissionPath';

const StarCamMissionSlot = memo(function StarCamMissionSlot({
  item,
  slot,
  onMissionPress,
}: {
  item: StarCamMapMissionItem;
  slot: MissionSlotTemplate;
  onMissionPress: (item: StarCamMapMissionItem) => void;
}) {
  const onPress = useCallback(() => {
    onMissionPress(item);
  }, [item, onMissionPress]);

  return (
    <View
      style={[
        mapStyles.missionAnchor,
        {
          left: `${slot.leftPct}%`,
          top: `${slot.topPct}%`,
        },
      ]}>
      <StarCamMissionBubble
        item={item}
        size={slot.size}
        delayMs={slot.delayMs}
        gradientColors={slot.gradientColors}
        shadowColor={slot.shadowColor}
        onPress={onPress}
      />
    </View>
  );
});

export interface StarCamCategoryMissionMapProps {
  preset: StarCamCategoryPreset;
  onBack: () => void;
  missions: StarCamMapMissionItem[];
  onMissionPress: (item: StarCamMapMissionItem) => void;
}

export const StarCamCategoryMissionMap = memo(function StarCamCategoryMissionMap({
  preset,
  onBack,
  missions,
  onMissionPress,
}: StarCamCategoryMissionMapProps) {
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });
  const { width, fontScale } = useWindowDimensions();
  const clampedFont = Math.min(Math.max(fontScale, 0.85), 1.35);
  const narrow = width < 360;

  const titleFontSize = Math.round(typography.sizes['4xl'] * (narrow ? 0.88 : 1) * Math.min(clampedFont, 1.12));
  const titleLineHeight = Math.round(titleFontSize * (preset.header.kind === 'image' ? 1.05 : 1.18));

  const footerFontSize = Math.round(typography.sizes.base * Math.min(clampedFont, 1.12));
  const footerLineHeight = Math.round(footerFontSize * 1.35);

  const slots = useMemo(() => missionSlotsForPreset(preset), [preset]);

  const onMapLayout = useCallback((e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setMapSize({ w, h });
  }, []);

  const visibleMissions = useMemo(() => missions.slice(0, slots.length), [missions, slots.length]);

  const pathD = useStarCamMissionPath(mapSize.w, mapSize.h);

  const titleBlockPaddingTop = spacing[4] + 44 + spacing[2] + Math.round((clampedFont - 1) * 6);

  const handleMissionPress = useCallback(
    (item: StarCamMapMissionItem) => {
      onMissionPress(item);
    },
    [onMissionPress]
  );

  return (
    <View style={[mapStyles.root, { borderColor: preset.borderColor }]}>
      <LinearGradient
        colors={[...preset.gradient]}
        locations={preset.gradientLocations ?? [0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={mapStyles.screenGradient}
      />
      <View style={[mapStyles.gradientOverlay, { backgroundColor: preset.overlayTint }]} pointerEvents="none" />

      <View style={mapStyles.decorLayer} pointerEvents="none">
        {preset.decor.map((d, i) => (
          <StarCamDecorEmoji key={`${d.emoji}-${i}`} emoji={d.emoji} style={d.style} seed={i} />
        ))}
      </View>

      <StarCamMapBackButton borderColor={preset.borderColor} onBack={onBack} />

      <View style={mapStyles.mainColumn} pointerEvents="box-none">
        <View style={[mapStyles.titleBlock, { paddingTop: titleBlockPaddingTop }]}>
          <StarCamCategoryHeaderTitle
            preset={preset}
            titleFontSize={titleFontSize}
            titleLineHeight={titleLineHeight}
          />
        </View>

        <View style={mapStyles.mapArea} onLayout={onMapLayout}>
          {pathD ? (
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Path d={pathD} stroke="#FFFFFF" strokeWidth={3} strokeDasharray="8 8" fill="none" opacity={0.5} />
            </Svg>
          ) : null}

          {visibleMissions.map((item, index) => {
            const slot = slots[index];
            if (!slot) return null;
            return (
              <StarCamMissionSlot
                key={item.id}
                item={item}
                slot={slot}
                onMissionPress={handleMissionPress}
              />
            );
          })}
        </View>

        <StarCamMapFooterHint text={preset.footerHint} fontSize={footerFontSize} lineHeight={footerLineHeight} />
      </View>
    </View>
  );
});
