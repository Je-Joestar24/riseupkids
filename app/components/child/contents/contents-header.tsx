/**
 * Contents Header (Explore → Videos by type)
 * Back to Explore, video type label, description, total stars earned.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { getVideoTypeLabel, VIDEO_TYPE_DESCRIPTIONS } from '@/constants/explore';
import { useExploreVideoWatch } from '@/hooks/exploreHook';

const VIDEO_TYPE_ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  arts_crafts: 'palette',
  cooking: 'chef-hat',
  music: 'music',
  movement_fitness: 'run',
  story_time: 'book-open-page-variant',
  manners_etiquette: 'hand-heart',
  replay: 'replay',
};

export interface ContentsHeaderProps {
  childId: string;
  videoType: string;
}

export function ContentsHeader({ childId, videoType }: ContentsHeaderProps) {
  const router = useRouter();
  const { getTotalStarsForVideoType } = useExploreVideoWatch(childId);
  const [totalStars, setTotalStars] = useState(0);

  useEffect(() => {
    if (!childId || !videoType) return;
    getTotalStarsForVideoType(videoType).then(setTotalStars).catch(() => setTotalStars(0));
  }, [childId, videoType, getTotalStarsForVideoType]);

  const label = getVideoTypeLabel(videoType);
  const description = VIDEO_TYPE_DESCRIPTIONS[videoType] ?? "Let's explore!";
  const iconName = VIDEO_TYPE_ICONS[videoType] ?? 'play-circle';

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => router.push(`/child/${childId}/explore` as never)}
        accessibilityRole="button"
        accessibilityLabel="Back to Explore"
        hitSlop={10}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.secondary} />
        <ThemedText style={styles.backText}>Back to Explore</ThemedText>
      </Pressable>

      <View style={styles.titleRow}>
        <MaterialCommunityIcons
          name={iconName}
          size={48}
          color={colors.orange}
          style={styles.titleIcon}
        />
        <ThemedText style={styles.title}>{label}</ThemedText>
      </View>

      <ThemedText style={styles.description}>{description}</ThemedText>

      <View style={styles.starsRow}>
        <MaterialCommunityIcons name="star" size={22} color={colors.accent} />
        <ThemedText style={styles.starsValue}>{totalStars}</ThemedText>
        <ThemedText style={styles.starsLabel}>Total Stars Earned</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: spacing[6],
    backgroundColor: colors.bgCard,
    borderWidth: 4,
    borderColor: colors.orange,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    gap: spacing[4],
    marginTop: spacing[5]
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    color: colors.secondary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
  },
  titleIcon: {
    marginRight: spacing[1],
  },
  title: {
    fontSize: 36,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 42,
    fontFamily: 'Quicksand_700Bold',
  },
  description: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_600SemiBold',
    opacity: 0.8,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    backgroundColor: 'rgba(253, 232, 222, 0.8)',
    borderRadius: 15,
    borderWidth: 0,
  },
  starsValue: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.accent,
  },
  starsLabel: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.accent,
  },
});
