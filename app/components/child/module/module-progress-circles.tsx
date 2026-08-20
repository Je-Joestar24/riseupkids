/**
 * Five reading/watch progress circles that shrink to the card width
 * so side circles are not clipped on iPhone SE and other small screens.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import {
  MODULE_PROGRESS_CIRCLE_COUNT,
  MODULE_PROGRESS_CIRCLE_GAP,
  getModuleProgressCircleSize,
} from '@/utils/moduleProgressCircles';

export interface ModuleProgressCirclesProps {
  filled: number;
  accessibilityLabel?: string;
}

export function ModuleProgressCircles({
  filled,
  accessibilityLabel = 'Reading progress',
}: ModuleProgressCirclesProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const size = getModuleProgressCircleSize(rowWidth);
  const checkSize = Math.max(10, size - 8);
  const count = Math.max(0, Math.min(MODULE_PROGRESS_CIRCLE_COUNT, Number(filled) || 0));

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: MODULE_PROGRESS_CIRCLE_COUNT, now: count }}>
      <View
        style={styles.inner}
        onLayout={(event) => {
          const next = Math.round(event.nativeEvent.layout.width);
          setRowWidth((prev) => (prev === next ? prev : next));
        }}>
        {Array.from({ length: MODULE_PROGRESS_CIRCLE_COUNT }, (_, index) => {
          const isFilled = index < count;
          return (
            <View
              key={index}
              style={[
                styles.circle,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                },
                isFilled && styles.circleFilled,
              ]}>
              {isFilled ? (
                <MaterialCommunityIcons name="check" size={checkSize} color={colors.textInverse} />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: MODULE_PROGRESS_CIRCLE_GAP,
    width: '100%',
  },
  circle: {
    borderWidth: 2,
    borderColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  circleFilled: {
    backgroundColor: colors.orange,
  },
});
