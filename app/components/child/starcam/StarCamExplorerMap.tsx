import React, { memo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

import { STARCAM_BACKGROUND } from './constants';
import { StarCamCategoryBubble } from './StarCamCategoryBubble';
import type { StarCamBubblePreset } from './types';

export interface StarCamExplorerMapProps {
  bubbleItems: StarCamBubblePreset[];
  pulse: Animated.Value;
  ping: Animated.Value;
  onBubblePress: (categoryKey: string) => void;
  onGoHome?: () => void;
  isLoadingCategories: boolean;
  error: string | null;
  onDismissError: () => void;
}

export const StarCamExplorerMap = memo(function StarCamExplorerMap({
  bubbleItems,
  pulse,
  ping,
  onBubblePress,
  onGoHome,
  isLoadingCategories,
  error,
  onDismissError,
}: StarCamExplorerMapProps) {
  return (
    <View style={styles.mapSection}>
      <Image source={STARCAM_BACKGROUND} style={styles.mapBackground} resizeMode="cover" />
      <View style={styles.bubbleArea}>
        {bubbleItems.map((item) => (
          <StarCamCategoryBubble
            key={item.key}
            item={item}
            pulse={pulse}
            ping={ping}
            onPress={onBubblePress}
          />
        ))}
      </View>

      {isLoadingCategories ? (
        <View style={styles.statusWrap} pointerEvents="box-none">
          <ActivityIndicator size="small" color={colors.accent} />
          <ThemedText style={styles.statusText}>Loading categories...</ThemedText>
        </View>
      ) : null}

      {error ? (
        <Pressable
          onPress={onDismissError}
          accessibilityRole="button"
          accessibilityLabel="Dismiss category loading error"
          style={styles.errorWrap}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </Pressable>
      ) : null}

      {onGoHome ? (
        <Pressable
          onPress={onGoHome}
          accessibilityRole="button"
          accessibilityLabel="Go back to child home page"
          style={({ pressed }) => [styles.homeButton, pressed && styles.homeButtonPressed]}>
          <MaterialCommunityIcons name="home" size={34} color={colors.textInverse} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  mapSection: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    backgroundColor: colors.bgSecondary,
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bubbleArea: {
    ...StyleSheet.absoluteFillObject,
  },
  statusWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    zIndex: 20,
  },
  statusText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorWrap: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[12],
    alignSelf: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: radii.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    zIndex: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  homeButton: {
    position: 'absolute',
    bottom: spacing[5],
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 999,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    zIndex: 25,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  homeButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
