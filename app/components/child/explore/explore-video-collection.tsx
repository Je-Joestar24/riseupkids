/**
 * Explore Video Collection
 * Cards per video type (Arts & Crafts, Cooking, Music, etc.): stars, progress, Continue/Start
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import {
  COLLECTION_VIDEO_TYPES,
  getVideoTypeLabel,
  type ExploreVideoType,
} from '@/constants/explore';
import { useExplore, useExploreVideoWatch } from '@/hooks/exploreHook';

export interface ExploreVideoCollectionProps {
  childId: string | null;
  onVideoTypePress?: (videoType: string) => void;
}

interface CollectionData {
  totalStars: number;
  totalVideos: number;
  viewedVideos: number;
  hasStarted: boolean;
}

const VIDEO_TYPE_ICONS: Record<string, string> = {
  arts_crafts: 'palette',
  cooking: 'chef-hat',
  music: 'music',
  movement_fitness: 'run',
  story_time: 'book-open-page-variant',
  manners_etiquette: 'hand-heart',
};

function VideoCollectionCard({
  videoType,
  data,
  onPress,
}: {
  videoType: ExploreVideoType;
  data: CollectionData;
  onPress: () => void;
}) {
  const progress = data.totalVideos > 0 ? (data.viewedVideos / data.totalVideos) * 100 : 0;
  const label = getVideoTypeLabel(videoType);
  const iconName = VIDEO_TYPE_ICONS[videoType] ?? 'play-circle';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${data.viewedVideos} of ${data.totalVideos} videos`}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons
          name={iconName as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
          size={48}
          color={colors.orange}
        />
        <View style={styles.starsRow}>
          <MaterialCommunityIcons name="star" size={20} color={colors.accent} />
          <ThemedText style={styles.starsValue}>{data.totalStars}</ThemedText>
        </View>
      </View>
      <ThemedText style={styles.cardTitle}>{label}</ThemedText>
      <View style={styles.progressWrap}>
        <View style={styles.progressHeader}>
          <ThemedText style={styles.progressLabel}>Progress</ThemedText>
          <ThemedText style={styles.progressCount}>
            {data.viewedVideos}/{data.totalVideos}
          </ThemedText>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </View>
      <View style={styles.ctaBtn}>
        <ThemedText style={styles.ctaBtnText}>
          {data.hasStarted ? 'Continue!' : 'Start now!'}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function ExploreVideoCollection({
  childId,
  onVideoTypePress,
}: ExploreVideoCollectionProps) {
  const { fetchByType } = useExplore();
  const { getVideoTypeProgress, getTotalStarsForVideoType } = useExploreVideoWatch(childId);
  const [dataByType, setDataByType] = useState<Record<string, CollectionData>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!childId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const next: Record<string, CollectionData> = {};
    for (const videoType of COLLECTION_VIDEO_TYPES) {
      try {
        const [list, progress, totalStars] = await Promise.all([
          fetchByType('video', { videoType, page: 1, limit: 20 }),
          getVideoTypeProgress(videoType),
          getTotalStarsForVideoType(videoType),
        ]);
        const totalVideos = progress.totalVideos || (Array.isArray(list) ? list.length : 0);
        const viewedVideos = progress.viewedVideos ?? 0;
        next[videoType] = {
          totalStars,
          totalVideos,
          viewedVideos,
          hasStarted: viewedVideos > 0,
        };
      } catch {
        next[videoType] = {
          totalStars: 0,
          totalVideos: 0,
          viewedVideos: 0,
          hasStarted: false,
        };
      }
    }
    setDataByType(next);
    setLoading(false);
  }, [childId, fetchByType, getVideoTypeProgress, getTotalStarsForVideoType]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {COLLECTION_VIDEO_TYPES.map((videoType) => (
        <VideoCollectionCard
          key={videoType}
          videoType={videoType}
          data={
            dataByType[videoType] ?? {
              totalStars: 0,
              totalVideos: 0,
              viewedVideos: 0,
              hasStarted: false,
            }
          }
          onPress={() => onVideoTypePress?.(videoType)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    minHeight: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[6],
    marginTop: spacing[6],
    justifyContent: 'space-around',
  },
  card: {
    width: '100%',
    minWidth: 140,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    gap: spacing[4],
  },
  cardPressed: {
    opacity: 0.95,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  starsValue: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.text,
  },
  cardTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '600',
    color: colors.secondary,
  },
  progressWrap: {
    gap: spacing[2],
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  progressCount: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textMuted,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.bgTertiary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 4,
  },
  ctaBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
  },
  ctaBtnText: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
