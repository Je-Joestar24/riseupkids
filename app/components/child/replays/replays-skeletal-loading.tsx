/**
 * Replays page skeletal loading — grid of video card placeholders.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

const SKELETON_CARD_COUNT = 3;

function SkeletonBone({ style }: { style?: StyleProp<ViewStyle> }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return <Animated.View style={[styles.bone, style, { opacity: pulse }]} />;
}

function ReplaysCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBone style={styles.cover} />
      <View style={styles.body}>
        <SkeletonBone style={styles.titleLine} />
        <SkeletonBone style={styles.titleLineShort} />
        <View style={styles.footerRow}>
          <SkeletonBone style={styles.viewsBone} />
          <SkeletonBone style={styles.watchBone} />
        </View>
      </View>
    </View>
  );
}

export function ReplaysCardsSkeleton({ count = SKELETON_CARD_COUNT }: { count?: number }) {
  return (
    <View
      style={styles.grid}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading replay videos">
      {Array.from({ length: count }).map((_, index) => (
        <ReplaysCardSkeleton key={`replays-skeleton-${index}`} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing[4],
    columnGap: spacing[4],
  },
  card: {
    width: '100%',
    minWidth: 160,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 0,
  },
  body: {
    padding: spacing[4],
    gap: spacing[3],
  },
  titleLine: {
    width: '92%',
    height: 16,
  },
  titleLineShort: {
    width: '68%',
    height: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewsBone: {
    width: 72,
    height: 14,
  },
  watchBone: {
    width: 88,
    height: 32,
  },
});
