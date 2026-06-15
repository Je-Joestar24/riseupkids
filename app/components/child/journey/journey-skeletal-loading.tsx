/**
 * My Journey skeletal loading — header, course cards, progress summary.
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
const MAX_CONTENT_WIDTH = 848;
const STATUS_ICON_WRAP = 40;

function SkeletonBone({
  style,
  variant = 'default',
}: {
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'onPrimary';
}) {
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

  return (
    <Animated.View
      style={[
        variant === 'onPrimary' ? styles.boneOnPrimary : styles.bone,
        style,
        { opacity: pulse },
      ]}
    />
  );
}

export function JourneyHeaderSkeleton() {
  return (
    <View style={styles.header} accessibilityLabel="Loading journey header">
      <SkeletonBone variant="onPrimary" style={styles.headerTitleBone} />
      <SkeletonBone variant="onPrimary" style={styles.headerSubtitleBone} />
    </View>
  );
}

function JourneyCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <SkeletonBone style={styles.coverBone} />
        <SkeletonBone style={styles.statusIconBone} />
        <SkeletonBone style={styles.stepBadgeBone} />
      </View>
      <View style={styles.cardContent}>
        <SkeletonBone style={styles.footstepsBone} />
        <View style={styles.textWrap}>
          <SkeletonBone style={styles.titleBone} />
          <SkeletonBone style={styles.descriptionBone} />
          <SkeletonBone style={styles.descriptionBoneShort} />
        </View>
      </View>
    </View>
  );
}

export function JourneyCardsSkeleton({ count = SKELETON_CARD_COUNT }: { count?: number }) {
  return (
    <View
      style={styles.cardList}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading journey steps">
      {Array.from({ length: count }).map((_, index) => (
        <JourneyCardSkeleton key={`journey-card-skeleton-${index}`} />
      ))}
    </View>
  );
}

export function JourneySummarySkeleton() {
  return (
    <View
      style={styles.summary}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading progress summary">
      <SkeletonBone style={styles.summaryTitleBone} />
      <View style={styles.summaryGrid}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={`summary-skeleton-${index}`} style={styles.summaryItem}>
            <SkeletonBone style={styles.summaryIconBone} />
            <SkeletonBone style={styles.summaryCountBone} />
            <SkeletonBone style={styles.summaryLabelBone} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Full journey page skeleton (header + cards + summary). */
export function JourneySkeletalLoading() {
  return (
    <View accessibilityLabel="Loading My Journey">
      <JourneyHeaderSkeleton />
      <JourneyCardsSkeleton />
      <JourneySummarySkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 4,
  },
  boneOnPrimary: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 4,
  },
  header: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    marginBottom: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  headerTitleBone: {
    width: 200,
    height: 36,
  },
  headerSubtitleBone: {
    width: 140,
    height: 24,
  },
  cardList: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    gap: spacing[4],
  },
  card: {
    width: '85%',
    backgroundColor: colors.bgCard,
    borderWidth: 3,
    borderColor: colors.border,
    overflow: 'hidden',
    margin: 'auto',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.bgTertiary,
    position: 'relative',
  },
  coverBone: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  statusIconBone: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    width: STATUS_ICON_WRAP,
    height: STATUS_ICON_WRAP,
    borderRadius: STATUS_ICON_WRAP / 2,
  },
  stepBadgeBone: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    width: 72,
    height: 28,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    padding: spacing[5],
    gap: spacing[4],
  },
  footstepsBone: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  textWrap: {
    flex: 1,
    gap: spacing[2],
  },
  titleBone: {
    width: '75%',
    height: 20,
  },
  descriptionBone: {
    width: '95%',
    height: 14,
  },
  descriptionBoneShort: {
    width: '60%',
    height: 14,
  },
  summary: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    padding: spacing[6],
    marginTop: spacing[12],
    backgroundColor: colors.bgLogin,
    borderRadius: 24,
    gap: spacing[5],
  },
  summaryTitleBone: {
    width: 180,
    height: 28,
    alignSelf: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing[4],
    paddingHorizontal: spacing[2],
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[2],
  },
  summaryIconBone: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  summaryCountBone: {
    width: 32,
    height: 24,
  },
  summaryLabelBone: {
    width: 64,
    height: 14,
  },
});
