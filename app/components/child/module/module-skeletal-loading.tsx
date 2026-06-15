/**
 * Module page skeletal loading — header, breadcrumbs, welcome/progress, footer only.
 * Content sections (videos, books, etc.) are not skeletonized.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

const COVER_HEIGHT = Math.round(256 * 1.1);
const MAX_CONTENT_WIDTH = 848;

function SkeletonBone({
  style,
  variant = 'default',
}: {
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'onPrimary' | 'onTeal';
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

  const boneStyle =
    variant === 'onPrimary'
      ? styles.boneOnPrimary
      : variant === 'onTeal'
        ? styles.boneOnTeal
        : styles.bone;

  return <Animated.View style={[boneStyle, style, { opacity: pulse }]} />;
}

export function ModuleHeaderSkeleton({ childId }: { childId: string }) {
  const router = useRouter();

  return (
    <View style={styles.coverWrap} accessibilityLabel="Loading module header">
      <SkeletonBone style={StyleSheet.absoluteFill} />
      <Pressable
        onPress={() => router.push(`/child/${childId}/journey` as never)}
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Go back to journey">
        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.secondary} />
      </Pressable>
      <View style={styles.headerStepBadge}>
        <SkeletonBone variant="onPrimary" style={styles.headerStepBoxBone} />
        <SkeletonBone variant="onPrimary" style={styles.headerStepTextBone} />
      </View>
    </View>
  );
}

export function ModuleBreadcrumbsSkeleton() {
  return (
    <View style={styles.breadcrumbs} accessibilityLabel="Loading breadcrumbs">
      <SkeletonBone variant="onTeal" style={styles.journeyButtonBone} />
      <SkeletonBone variant="onTeal" style={styles.chevronBone} />
      <SkeletonBone variant="onTeal" style={styles.breadcrumbStepBone} />
    </View>
  );
}

export function ModuleProgressSkeleton() {
  return (
    <View style={styles.progressCard} accessibilityLabel="Loading course welcome">
      <SkeletonBone style={styles.progressTitleBone} />
      <SkeletonBone style={styles.progressDescriptionBone} />
      <SkeletonBone style={styles.progressDescriptionBoneShort} />
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <SkeletonBone style={styles.progressLabelBone} />
          <SkeletonBone style={styles.progressCountBone} />
        </View>
        <SkeletonBone style={styles.progressBarBone} />
      </View>
      <View style={styles.progressCardsRow}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={`module-progress-skeleton-${index}`} style={styles.progressStatCard}>
            <SkeletonBone style={styles.progressStatIconBone} />
            <SkeletonBone style={styles.progressStatCountBone} />
            <SkeletonBone style={styles.progressStatLabelBone} />
          </View>
        ))}
      </View>
    </View>
  );
}

export function ModuleFooterSkeleton() {
  return (
    <View style={styles.footerCard} accessibilityLabel="Loading module footer">
      <SkeletonBone style={styles.footerStarBone} />
      <SkeletonBone style={styles.footerTitleBone} />
      <SkeletonBone style={styles.footerSubtitleBone} />
      <SkeletonBone style={styles.footerSubtitleBoneShort} />
    </View>
  );
}

/** Header + breadcrumbs + welcome progress + footer (no content lists). */
export function ModuleShellSkeletalLoading({ childId }: { childId: string }) {
  return (
    <View accessibilityLabel="Loading module">
      <ModuleHeaderSkeleton childId={childId} />
      <ModuleBreadcrumbsSkeleton />
      <ModuleProgressSkeleton />
      <ModuleFooterSkeleton />
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
  boneOnTeal: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
  },
  coverWrap: {
    position: 'relative',
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    height: COVER_HEIGHT,
    marginTop: spacing[5],
    overflow: 'hidden',
    backgroundColor: colors.bgTertiary,
  },
  backButton: {
    position: 'absolute',
    top: spacing[5],
    left: spacing[5],
    width: 40,
    height: 40,
    borderRadius: 24,
    backgroundColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  backButtonPressed: {
    opacity: 0.9,
  },
  headerStepBadge: {
    position: 'absolute',
    bottom: spacing[5],
    left: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 20,
    zIndex: 1,
  },
  headerStepBoxBone: {
    width: 16,
    height: 16,
  },
  headerStepTextBone: {
    width: 120,
    height: 18,
  },
  breadcrumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[6],
    flexWrap: 'wrap',
    width: '100%',
  },
  journeyButtonBone: {
    width: 140,
    height: 40,
  },
  chevronBone: {
    width: 16,
    height: 20,
  },
  breadcrumbStepBone: {
    width: 120,
    height: 40,
  },
  progressCard: {
    width: '100%',
    padding: spacing[8],
    backgroundColor: colors.textInverse,
    borderRadius: 24,
    marginTop: spacing[8],
    gap: spacing[3],
  },
  progressTitleBone: {
    width: '70%',
    height: 36,
  },
  progressDescriptionBone: {
    width: '95%',
    height: 20,
  },
  progressDescriptionBoneShort: {
    width: '60%',
    height: 20,
    marginBottom: spacing[3],
  },
  progressSection: {
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabelBone: {
    width: 100,
    height: 14,
  },
  progressCountBone: {
    width: 120,
    height: 14,
  },
  progressBarBone: {
    width: '100%',
    height: 16,
    borderRadius: 9999,
  },
  progressCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    marginTop: spacing[3],
  },
  progressStatCard: {
    flex: 1,
    minWidth: 50,
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: 16,
    backgroundColor: 'rgb(244, 237, 216)',
    gap: spacing[2],
  },
  progressStatIconBone: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  progressStatCountBone: {
    width: 32,
    height: 24,
  },
  progressStatLabelBone: {
    width: 64,
    height: 14,
  },
  footerCard: {
    width: '100%',
    padding: spacing[8],
    backgroundColor: colors.textInverse,
    borderRadius: 24,
    marginTop: spacing[8],
    alignItems: 'center',
    gap: spacing[3],
  },
  footerStarBone: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  footerTitleBone: {
    width: 200,
    height: 28,
  },
  footerSubtitleBone: {
    width: '90%',
    height: 18,
  },
  footerSubtitleBoneShort: {
    width: '70%',
    height: 18,
  },
});
