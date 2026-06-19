/**
 * Module Audio Assignments – 2-column grid, square covers, headphones badge, time, title, status.
 * Shows "Let's Try Again!" when status is rejected.
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

export type AudioStatus = 'not_started' | 'in_progress' | 'completed' | 'rejected' | null;

export interface ModuleAudioAssignmentsProps {
  audioAssignments: PopulatedContentItem[];
  getStatus: (audio: PopulatedContentItem) => AudioStatus;
  getStarPoints?: (audio: PopulatedContentItem) => number;
  onAudioPress?: (audio: PopulatedContentItem) => void;
}

function AudioCard({
  audio,
  status,
  starPoints,
  onPress,
}: {
  audio: PopulatedContentItem;
  status: AudioStatus;
  starPoints: number;
  onPress: () => void;
}) {
  const coverUrl = getCoverImageUrl(audio.coverImage ?? undefined);
  const isRejected = status === 'rejected';
  const timeMin = Number(audio.estimatedDuration ?? 0);
  const timeLabel = timeMin > 0 ? `${timeMin} min` : '0 min';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={audio.title ? `${audio.title}, Audio` : 'Audio assignment'}>
      <View style={styles.squareWrap}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel={audio.title ? `${audio.title} cover` : 'Audio cover'}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
        <View style={styles.headphonesBadge}>
          <MaterialCommunityIcons name="headphones" size={20} color={colors.textInverse} />
        </View>
        <View style={styles.timeBadge}>
          <ThemedText style={styles.timeText}>{timeLabel}</ThemedText>
        </View>
      </View>
      <View style={styles.content}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {audio.title ?? 'Audio Assignment'}
        </ThemedText>
        {isRejected && (
          <View style={styles.tryAgainBadge}>
            <View style={styles.tryAgainIconWrap}>
              <MaterialCommunityIcons name="star" size={16} color={colors.textInverse} />
            </View>
            <ThemedText style={styles.tryAgainText}>Let's Try Again!</ThemedText>
          </View>
        )}
        <View style={styles.footer}>
          <View style={styles.audioLabel}>
            <View style={styles.audioIconWrap}>
              <MaterialCommunityIcons name="headphones" size={20} color={colors.textInverse} />
            </View>
            <ThemedText style={styles.audioLabelText}>Audio</ThemedText>
          </View>
          {starPoints > 0 && (
            <View style={styles.starPointsBadge}>
              <ThemedText style={styles.starPointsPlus}>+</ThemedText>
              <ThemedText style={styles.starPointsValue}>{starPoints}</ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export function ModuleAudioAssignments({
  audioAssignments,
  getStatus,
  getStarPoints = () => 0,
  onAudioPress,
}: ModuleAudioAssignmentsProps) {
  if (!audioAssignments?.length) {
    return (
      <View style={styles.section}>
        <ThemedText style={styles.emptyText}>No audio assignments in this course.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Audio Assignment</ThemedText>
      <View style={styles.grid}>
        {audioAssignments.map((audio, index) => (
          <View key={audio._id ?? audio._contentId ?? index} style={styles.cardWrap}>
            <AudioCard
              audio={audio}
              status={getStatus(audio)}
              starPoints={getStarPoints(audio)}
              onPress={() => onAudioPress?.(audio)}
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
    color: colors.text,
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
  headphonesBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    marginBottom: spacing[3],
  },
  tryAgainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: 10,
    paddingHorizontal: spacing[4],
    backgroundColor: 'rgba(255, 183, 77, 0.15)',
    borderRadius: 12,
    marginBottom: spacing[3],
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 152, 0, 0.4)',
  },
  tryAgainIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryAgainText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.orange,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  audioIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  starPointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.bgLogin,
    borderRadius: 16,
  },
  starPointsPlus: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  starPointsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing[8],
  },
});
