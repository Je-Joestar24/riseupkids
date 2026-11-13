/**
 * Experience Cards (Explore → Experience)
 * The published experiences, one card per row: cover picture, title, a line of description and the video
 * count. Placeholders on a first load, a message with Try again when nothing could be loaded, a friendly
 * note when there are none.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChildNetworkRetry } from '@/components/child/common/child-network-retry';
import { RemoteImage } from '@/components/common/remote-image';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useExperiences } from '@/hooks/experienceHook';
import type { ExperienceCardData } from '@/services/experienceService';
import { experienceDetailRoute, videoCountLabel } from '@/utils/experienceFormat';
import { isNetworkError } from '@/utils/networkError';
import { ExperienceCoverPlaceholder } from './experience-cover-placeholder';
import { ExperiencesSkeleton } from './experiences-skeletal-loading';

export interface ExperienceCardProps {
  experience: ExperienceCardData;
  coverUrl: string | null;
  /** Position on the page: the first pictures load first. */
  index: number;
  /** Opens the experience. Without it the card is plain (nowhere to go). */
  onPress?: () => void;
}

export function ExperienceCard({ experience, coverUrl, index, onPress }: ExperienceCardProps) {
  const content = (
    <>
      <View style={styles.coverWrap}>
        {coverUrl ? (
          <RemoteImage
            uri={coverUrl}
            index={index}
            style={StyleSheet.absoluteFill}
            accessibilityLabel={experience.title}
          />
        ) : (
          <ExperienceCoverPlaceholder index={index} />
        )}
      </View>
      <View style={styles.body}>
        <ThemedText style={styles.title} numberOfLines={2} accessibilityRole="header">
          {experience.title}
        </ThemedText>
        {experience.description ? (
          <ThemedText style={styles.description} numberOfLines={2}>
            {experience.description}
          </ThemedText>
        ) : null}
        <ThemedText style={styles.count}>{videoCountLabel(experience.videoCount)}</ThemedText>
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.card} accessibilityLabel={experience.title} testID="experience-card">
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={experience.title}
      accessibilityHint="Opens this experience"
      testID="experience-card">
      {content}
    </Pressable>
  );
}

export interface ExperienceCardsProps {
  /** The child whose list this is; needed to open an experience (without it the cards are plain). */
  childId?: string;
}

export function ExperienceCards({ childId }: ExperienceCardsProps = {}) {
  const router = useRouter();
  const { experiences, loading, error, retry, getCoverImageUrl } = useExperiences();

  // Offline: the global no-internet dialog is in charge, and the list loads again when it reconnects.
  if (loading || (error && !experiences.length && isNetworkError(error))) {
    return <ExperiencesSkeleton />;
  }

  if (error && !experiences.length) {
    return <ChildNetworkRetry title="Could not load" message={error} onRetry={retry} />;
  }

  if (!experiences.length) {
    return (
      <View style={styles.emptyWrap} accessibilityRole="summary">
        <ThemedText style={styles.emptyTitle}>No Experiences Yet</ThemedText>
        <ThemedText style={styles.emptyText}>New experiences are coming soon. Check back later!</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.list} accessibilityLabel="Experiences">
      {experiences.map((experience, index) => (
        <ExperienceCard
          key={experience.uuid}
          experience={experience}
          coverUrl={getCoverImageUrl(experience.coverImage)}
          index={index}
          onPress={childId ? () => router.push(experienceDetailRoute(childId, experience.uuid) as never) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing[4],
  },
  card: {
    width: '100%',
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
  cardPressed: {
    opacity: 0.9,
  },
  coverWrap: {
    width: '100%',
    height: 180,
    backgroundColor: colors.bgTertiary,
  },
  body: {
    padding: spacing[4],
    gap: spacing[2],
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.secondary,
    lineHeight: 26,
  },
  description: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  count: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_700Bold',
    color: colors.orange,
  },
  emptyWrap: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.bgCard,
  },
  emptyTitle: {
    fontSize: typography.sizes['2xl'],
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.secondary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
