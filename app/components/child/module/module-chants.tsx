/**
 * Module Chants – 2-column grid, square covers, completion check, star, time, title.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import type { PopulatedContentItem } from '@/services/moduleService';
import { getCoverImageUrl } from '@/components/child/module/module-utils';

const CARD_GAP = spacing[4];
const CARD_WIDTH_PCT = '48%';

export interface ModuleChantsProps {
  chants: PopulatedContentItem[];
  isCompleted: (chant: PopulatedContentItem) => boolean;
  getStarPoints?: (chant: PopulatedContentItem) => number;
  onChantPress?: (chant: PopulatedContentItem) => void;
}

function ChantCard({
  chant,
  isCompleted: completed,
  starPoints,
  onPress,
}: {
  chant: PopulatedContentItem;
  isCompleted: boolean;
  starPoints: number;
  onPress: () => void;
}) {
  const coverUrl = getCoverImageUrl(chant.coverImage ?? undefined);
  const timeMin = Number(chant.estimatedDuration ?? 0);
  const timeLabel = timeMin > 0 ? `${timeMin} min` : '0 min';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={chant.title ? `${chant.title}, Chant` : 'Chant'}>
      <View style={styles.squareWrap}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel={chant.title ? `${chant.title} cover` : 'Chant cover'}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
        {completed && (
          <View style={styles.checkBadge}>
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.secondary} />
          </View>
        )}
        {starPoints > 0 && (
          <View style={styles.starBadge}>
            <MaterialCommunityIcons name="star" size={16} color={colors.textInverse} />
            <ThemedText style={styles.starCount}>{starPoints}</ThemedText>
          </View>
        )}
        <View style={styles.timeBadge}>
          <ThemedText style={styles.timeText}>{timeLabel}</ThemedText>
        </View>
      </View>
      <View style={styles.content}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {chant.title ?? 'Chant'}
        </ThemedText>
        {chant.description ? (
          <ThemedText style={styles.description} numberOfLines={2}>
            {chant.description}
          </ThemedText>
        ) : null}
        <View style={styles.footer}>
          <View style={styles.chantLabel}>
            <View style={styles.chantIconWrap}>
              <MaterialCommunityIcons name="music" size={20} color={colors.textInverse} />
            </View>
            <ThemedText style={styles.chantLabelText}>Chant</ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function ModuleChants({
  chants,
  isCompleted,
  getStarPoints = () => 0,
  onChantPress,
}: ModuleChantsProps) {
  if (!chants?.length) {
    return (
      <View style={styles.section}>
        <ThemedText style={styles.emptyText}>No chants in this course.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Chants</ThemedText>
      <View style={styles.grid}>
        {chants.map((chant, index) => (
          <View key={chant._id ?? chant._contentId ?? index} style={styles.cardWrap}>
            <ChantCard
              chant={chant}
              isCompleted={isCompleted(chant)}
              starPoints={getStarPoints(chant)}
              onPress={() => onChantPress?.(chant)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
    marginTop: spacing[8],
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textInverse,
    marginBottom: spacing[6],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardWrap: {
    width: CARD_WIDTH_PCT,
    marginBottom: CARD_GAP,
  },
  card: {
    backgroundColor: colors.textInverse,
    borderRadius: 0,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.92,
  },
  squareWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.bgTertiary,
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgTertiary,
  },
  checkBadge: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  starBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.accent,
    borderRadius: 9999,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  starCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textInverse,
  },
  timeBadge: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    paddingVertical: 6,
    paddingHorizontal: spacing[3],
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 22,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textInverse,
  },
  content: {
    padding: spacing[5],
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  description: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.textSecondary,
    marginBottom: spacing[3],
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chantLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chantIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chantLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing[8],
  },
});
