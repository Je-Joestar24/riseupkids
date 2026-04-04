import React, { memo } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

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
  isLoadingCategories: boolean;
  error: string | null;
  onDismissError: () => void;
}

export const StarCamExplorerMap = memo(function StarCamExplorerMap({
  bubbleItems,
  pulse,
  ping,
  onBubblePress,
  isLoadingCategories,
  error,
  onDismissError,
}: StarCamExplorerMapProps) {
  return (
    <ScrollView
      style={styles.mapScroll}
      contentContainerStyle={styles.mapScrollContent}
      showsVerticalScrollIndicator={false}>
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
        <View style={styles.statusWrap}>
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
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  mapScroll: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  mapScrollContent: {
    flexGrow: 1,
    paddingBottom: spacing[8],
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bubbleArea: {
    width: '100%',
    flex: 1,
    minHeight: 720,
    position: 'relative',
  },
  statusWrap: {
    marginTop: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  statusText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorWrap: {
    alignSelf: 'center',
    marginTop: spacing[2],
    backgroundColor: '#fee2e2',
    borderRadius: radii.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
});
