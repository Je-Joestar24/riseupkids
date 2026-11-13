/**
 * Experience page, everything that is not the experience itself: the back arrow (always there, so the child can
 * leave from any state), the placeholder for a first load, the "not available" screen (the server has no such
 * experience: nothing to try again) and the "could not load" screen.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ChildNetworkRetry } from '@/components/child/common/child-network-retry';
import { Band, CREAM, PALE, PEACH, TEAL_INK, partStyles } from '@/components/child/experience/experience-page-parts';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { Quicksand } from '@/constants/theme';
import { EXPERIENCE_DETAIL_COPY } from '@/utils/experienceFormat';

export interface BackToListButtonProps {
  onBack: () => void;
}

/**
 * "Back to Experiences" as just an arrow, at the top left of the page, in the same cream as the title band. It is part
 * of the page (it scrolls away with it) and sits on the left edge of the video column (the same side space and column
 * width as the video bands), so it lines up with the videos below. The screen reader says where it goes.
 */
export function BackArrow({ onBack }: BackToListButtonProps) {
  return (
    <View style={styles.backRow}>
      <View style={[styles.backColumn, partStyles.videoWrap]}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={EXPERIENCE_DETAIL_COPY.backToList}
          hitSlop={6}
          testID="experience-back-button"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={TEAL_INK} />
        </Pressable>
      </View>
    </View>
  );
}

function Bone({ style }: { style?: object }) {
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

/** Placeholders in the shape of the page (title, one video), for the very first time an experience opens. */
export function ExperienceDetailSkeleton({ onBack }: BackToListButtonProps) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <BackArrow onBack={onBack} />
      <Band color={CREAM}>
        <View style={styles.skeletonTitle} accessibilityRole="progressbar" accessibilityLabel="Loading experience">
          <Bone style={{ width: '70%', height: 34 }} />
          <Bone style={{ width: '90%', height: 18 }} />
          <Bone style={{ width: '60%', height: 18 }} />
        </View>
      </Band>
      <Band color={PALE} wrapStyle={partStyles.videoWrap}>
        <Bone style={styles.skeletonVideo} />
      </Band>
    </ScrollView>
  );
}

export interface ExperienceNotFoundProps extends BackToListButtonProps {
  onSeeAll: () => void;
}

/** The server has no such experience (never existed, or taken down). The way out is the list. */
export function ExperienceNotFound({ onBack, onSeeAll }: ExperienceNotFoundProps) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <BackArrow onBack={onBack} />
      <Band color={CREAM}>
        <View style={styles.notFound} accessibilityRole="summary">
          <ThemedText accessibilityRole="header" style={styles.notFoundTitle}>
            {EXPERIENCE_DETAIL_COPY.notFoundTitle}
          </ThemedText>
          <ThemedText style={styles.notFoundText}>{EXPERIENCE_DETAIL_COPY.notFoundText}</ThemedText>
          <Pressable
            onPress={onSeeAll}
            accessibilityRole="button"
            accessibilityLabel={EXPERIENCE_DETAIL_COPY.seeAll}
            style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
            <ThemedText style={styles.seeAllText}>{EXPERIENCE_DETAIL_COPY.seeAll}</ThemedText>
          </Pressable>
        </View>
      </Band>
      <View style={styles.fill} />
    </ScrollView>
  );
}

export interface ExperienceLoadFailedProps extends BackToListButtonProps {
  message: string;
  onRetry: () => void;
}

/** The experience could not be loaded: the reason and Try again, with the back arrow above it. */
export function ExperienceLoadFailed({ onBack, message, onRetry }: ExperienceLoadFailedProps) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <BackArrow onBack={onBack} />
      <ChildNetworkRetry title="Could not load" message={message} onRetry={onRetry} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PEACH },
  pageContent: { flexGrow: 1 },
  fill: { flex: 1, backgroundColor: PEACH },
  pressed: { opacity: 0.85 },
  backRow: { backgroundColor: CREAM, paddingTop: 14, paddingHorizontal: spacing[5] },
  backColumn: { width: '100%', alignSelf: 'center' },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textInverse,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: TEAL_INK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  bone: { backgroundColor: colors.bgTertiary, borderRadius: 4 },
  skeletonTitle: { width: '100%', alignItems: 'center', gap: spacing[3] },
  skeletonVideo: { width: '100%', aspectRatio: 16 / 9, borderRadius: radii.lg },
  notFound: { alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] },
  notFoundTitle: { fontFamily: Quicksand.bold, fontSize: 26, lineHeight: 33, color: TEAL_INK, textAlign: 'center' },
  notFoundText: { fontFamily: 'Quicksand_500Medium', fontSize: 16, lineHeight: 26, color: TEAL_INK, textAlign: 'center' },
  seeAll: { marginTop: spacing[2], paddingVertical: 13, paddingHorizontal: 28, borderRadius: radii.full, backgroundColor: colors.orange },
  seeAllText: { fontFamily: Quicksand.bold, fontSize: 13.5, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textInverse },
});
