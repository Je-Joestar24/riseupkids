/**
 * Experiences skeletal loading — card-shaped placeholders for the first load only.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

const SKELETON_CARD_COUNT = 3;

function SkeletonBone({ style }: { style?: StyleProp<ViewStyle> }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 900, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return <Animated.View style={[styles.bone, style, { opacity: pulse }]} />;
}

export function ExperiencesSkeleton({ count = SKELETON_CARD_COUNT }: { count?: number }) {
  return (
    <View
      style={styles.list}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading experiences">
      {Array.from({ length: count }).map((_, index) => (
        <View key={`experience-skeleton-${index}`} style={styles.card}>
          <SkeletonBone style={styles.cover} />
          <View style={styles.body}>
            <SkeletonBone style={styles.titleLine} />
            <SkeletonBone style={styles.countLine} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 4,
  },
  list: {
    gap: spacing[4],
  },
  card: {
    width: '100%',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: 180,
    borderRadius: 0,
  },
  body: {
    padding: spacing[4],
    gap: spacing[3],
  },
  titleLine: {
    width: '70%',
    height: 20,
  },
  countLine: {
    width: '35%',
    height: 14,
  },
});
