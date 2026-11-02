/**
 * Module Videos – 2-column grid, square covers, progress circles, completion, star, time.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RemoteImage } from '@/components/common/remote-image';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import type { PopulatedContentItem } from '@/services/moduleService';
import { getCoverImageUrl } from '@/components/child/module/module-utils';
import { ModuleProgressCircles } from '@/components/child/module/module-progress-circles';

const CARD_GAP = spacing[4];
const CARD_WIDTH_PCT = '48%';

export interface ModuleVideosProps {
  videos: PopulatedContentItem[];
  getProgressCircles: (video: PopulatedContentItem) => number;
  isCompleted: (video: PopulatedContentItem) => boolean;
  getStarPoints?: (video: PopulatedContentItem) => number;
  onVideoPress?: (video: PopulatedContentItem) => void;
  /** How many pictures come before this section on the page (sets their loading order). */
  imageOffset?: number;
}

function VideoCard({
  video,
  progressCircles,
  isCompleted: completed,
  starPoints,
  onPress,
  imageIndex,
}: {
  video: PopulatedContentItem;
  progressCircles: number;
  isCompleted: boolean;
  starPoints: number;
  onPress: () => void;
  /** Position of this picture on the page, for the loading order. */
  imageIndex: number;
}) {
  const coverUrl = getCoverImageUrl(video.thumbnail ?? video.coverImage ?? undefined);
  const durationSec = Number(video.duration ?? 0);
  const durationMin = Math.ceil(durationSec / 60);
  const timeLabel = durationMin > 0 ? `${durationMin} min` : '0 min';
  const statusLabel = completed ? 'Completed' : 'Not completed';
  const a11yLabel = video.title ? `${video.title}, ${statusLabel}` : statusLabel;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}>
      <View style={styles.squareWrap}>
        {coverUrl ? (
          <RemoteImage
            uri={coverUrl}
            index={imageIndex}
            style={StyleSheet.absoluteFill}
            accessibilityLabel={video.title ? `${video.title} thumbnail` : 'Video thumbnail'}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
        {completed && (
          <View style={styles.checkBadge}>
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.orange} />
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
      <ModuleProgressCircles
        filled={progressCircles}
        accessibilityLabel={`${video.title || 'Video'} watch progress`}
      />
    </Pressable>
  );
}

export function ModuleVideos({
  videos,
  getProgressCircles,
  isCompleted,
  getStarPoints = () => 0,
  onVideoPress,
  imageOffset = 0,
}: ModuleVideosProps) {
  if (!videos?.length) {
    return null;
  }

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Videos</ThemedText>
      <View style={styles.grid}>
        {videos.map((video, index) => (
          <View key={video._id ?? video._contentId ?? index} style={styles.cardWrap}>
            <VideoCard
              video={video}
              progressCircles={getProgressCircles(video)}
              isCompleted={isCompleted(video)}
              starPoints={getStarPoints(video)}
              onPress={() => onVideoPress?.(video)}
              imageIndex={imageOffset + index}
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
});
