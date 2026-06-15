/**
 * Explore skeletal loading placeholders.
 * Mirrors explore page layout: replays row, video collection grid, star cam CTA.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { COLLECTION_VIDEO_TYPES } from '@/constants/explore';

const REPLAY_CARD_WIDTH = 288;
const REPLAY_CARD_COUNT = 4;

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

/** Horizontal replay cards skeleton (matches ExploreReplays + ExploreReplaysCard). */
export function ExploreReplaysSkeleton() {
  return (
    <View
      style={styles.replaysSection}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading replays">
      <View style={styles.replaysHeader}>
        <View style={styles.replaysTitleRow}>
          <SkeletonBone style={styles.replaysPlayBadge} />
          <SkeletonBone style={styles.replaysTitleBone} />
        </View>
        <SkeletonBone style={styles.replaysViewAllBone} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.replaysScrollContent}
        style={styles.replaysScroll}>
        {Array.from({ length: REPLAY_CARD_COUNT }).map((_, index) => (
          <View key={`replay-skeleton-${index}`} style={styles.replayCard}>
            <SkeletonBone style={styles.replayCover} />
            <View style={styles.replayBody}>
              <SkeletonBone style={styles.replayTitleLine} />
              <SkeletonBone style={styles.replayTitleLineShort} />
              <View style={styles.replayFooter}>
                <SkeletonBone style={styles.replayViewsBone} />
                <SkeletonBone style={styles.replayWatchBone} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** Video collection grid skeleton (matches ExploreVideoCollection cards). */
export function ExploreVideoCollectionSkeleton() {
  return (
    <View
      style={styles.collectionSection}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading video collections">
      <View style={styles.collectionGrid}>
        {COLLECTION_VIDEO_TYPES.map((videoType) => (
          <View key={`collection-skeleton-${videoType}`} style={styles.collectionCard}>
            <View style={styles.collectionCardHeader}>
              <SkeletonBone style={styles.collectionIconBone} />
              <SkeletonBone style={styles.collectionStarsBone} />
            </View>
            <SkeletonBone style={styles.collectionTitleBone} />
            <View style={styles.collectionProgressWrap}>
              <View style={styles.collectionProgressHeader}>
                <SkeletonBone style={styles.collectionProgressLabelBone} />
                <SkeletonBone style={styles.collectionProgressCountBone} />
              </View>
              <SkeletonBone style={styles.collectionProgressBarBone} />
            </View>
            <SkeletonBone style={styles.collectionCtaBone} />
          </View>
        ))}
      </View>
    </View>
  );
}

/** Star Cam CTA skeleton (matches ExploreStarCam layout). */
export function ExploreStarCamSkeleton() {
  return (
    <View
      style={styles.starCamCard}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading Star Cam">
      <SkeletonBone style={styles.starCamButtonBone} />
    </View>
  );
}

/** Full explore data skeleton (replays + collections only; static sections render separately). */
export function ExploreSkeletalLoading() {
  return (
    <View accessibilityLabel="Loading explore content">
      <ExploreReplaysSkeleton />
      <ExploreVideoCollectionSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 4,
  },
  replaysSection: {
    marginBottom: spacing[6],
    marginTop: spacing[6],
  },
  replaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  replaysTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  replaysPlayBadge: {
    width: 40,
    height: 28,
    borderRadius: 4,
  },
  replaysTitleBone: {
    width: 160,
    height: 28,
  },
  replaysViewAllBone: {
    width: 88,
    height: 22,
  },
  replaysScroll: {
    marginHorizontal: -spacing[4],
  },
  replaysScrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  replayCard: {
    width: REPLAY_CARD_WIDTH,
    flexShrink: 0,
    backgroundColor: colors.bgCard,
    marginRight: spacing[4],
    overflow: 'hidden',
  },
  replayCover: {
    width: '100%',
    height: 160,
    borderRadius: 0,
  },
  replayBody: {
    padding: spacing[5],
    gap: spacing[2],
  },
  replayTitleLine: {
    width: '92%',
    height: 18,
  },
  replayTitleLineShort: {
    width: '68%',
    height: 18,
  },
  replayFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  replayViewsBone: {
    width: 72,
    height: 14,
  },
  replayWatchBone: {
    width: 96,
    height: 32,
  },
  collectionSection: {
    marginTop: spacing[6],
  },
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[6],
    justifyContent: 'space-around',
  },
  collectionCard: {
    width: '100%',
    minWidth: 140,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    gap: spacing[4],
  },
  collectionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  collectionIconBone: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  collectionStarsBone: {
    width: 40,
    height: 20,
  },
  collectionTitleBone: {
    width: '70%',
    height: 24,
  },
  collectionProgressWrap: {
    gap: spacing[2],
  },
  collectionProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  collectionProgressLabelBone: {
    width: 64,
    height: 14,
  },
  collectionProgressCountBone: {
    width: 36,
    height: 14,
  },
  collectionProgressBarBone: {
    width: '100%',
    height: 8,
    borderRadius: 4,
  },
  collectionCtaBone: {
    width: '100%',
    height: 48,
  },
  starCamCard: {
    marginTop: spacing[8],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.bgCard,
  },
  starCamButtonBone: {
    width: '100%',
    height: 96,
    borderRadius: 0,
  },
});
