/**
 * Contents Cards (Explore content by video type)
 * Grid of video cards: cover, completion badge, duration, title, description, Start/Review Lesson.
 * Mirrors web ExploreVideosCards; uses Quicksand font for theme consistency.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { VideoPlayerModal } from '@/components/child/common/video-player-modal';
import type { ExploreVideoInput } from '@/components/child/common/video-player-modal';
import { ThemedText } from '@/components/themed-text';
import { ContentsEmpty } from '@/components/child/contents/contents-empty';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useExplore, useExploreVideoWatch } from '@/hooks/exploreHook';
import type { ExploreContentItem } from '@/services/exploreService';

export interface ContentsCardsProps {
  childId: string;
  videoType: string;
}

function formatDuration(seconds: number | null | undefined): string {
  const s = Number(seconds ?? 0);
  const mins = Math.ceil(s / 60);
  return `${Math.max(0, mins)} min`;
}

function truncateDescription(text: string | null | undefined, maxLen = 150): string {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}

export function ContentsCards({ childId, videoType }: ContentsCardsProps) {
  const { fetchByType, getCoverImageUrl, getVideoFileUrl } = useExplore();
  const { getExploreVideoWatchStatus } = useExploreVideoWatch(childId);

  const [videos, setVideos] = useState<ExploreContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchStatuses, setWatchStatuses] = useState<
    Record<
      string,
      { isWatched: boolean; watchCount: number; starsAwarded: boolean }
    >
  >({});

  const [selected, setSelected] = useState<ExploreContentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!childId || !videoType) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchByType('video', { videoType, page: 1, limit: 100 })
      .then((list) => {
        if (cancelled) return;
        setVideos(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setVideos([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [childId, videoType, fetchByType]);

  useEffect(() => {
    if (!childId || videos.length === 0) return;
    let cancelled = false;
    const loadStatuses = async () => {
      const entries = await Promise.all(
        videos.map(async (v) => {
          const id = String(v._id ?? '');
          if (!id) return [id, null] as const;
          try {
            const status = await getExploreVideoWatchStatus(id);
            return [
              id,
              {
                isWatched:
                  !!(status?.starsAwarded ?? (status?.currentWatchCount ?? 0) > 0),
                watchCount: status?.currentWatchCount ?? 0,
                starsAwarded: status?.starsAwarded ?? false,
              },
            ] as const;
          } catch {
            return [
              id,
              { isWatched: false, watchCount: 0, starsAwarded: false },
            ] as const;
          }
        })
      );
      if (cancelled) return;
      const map: Record<string, { isWatched: boolean; watchCount: number; starsAwarded: boolean }> = {};
      entries.forEach(([id, s]) => {
        if (id && s) map[id] = s;
      });
      setWatchStatuses(map);
    };
    loadStatuses();
    return () => {
      cancelled = true;
    };
  }, [childId, videos, getExploreVideoWatchStatus]);

  const handleOpen = useCallback((v: ExploreContentItem) => {
    setSelected(v);
    setModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    setSelected(null);
  }, []);

  const handleVideoComplete = useCallback(
    async (_video: unknown) => {
      const v = selected;
      if (!v?._id) return;
      const id = String(v._id);
      try {
        const status = await getExploreVideoWatchStatus(id);
        setWatchStatuses((prev) => ({
          ...prev,
          [id]: {
            isWatched:
              !!(status?.starsAwarded ?? (status?.currentWatchCount ?? 0) > 0),
            watchCount: status?.currentWatchCount ?? 0,
            starsAwarded: status?.starsAwarded ?? false,
          },
        }));
      } catch {
        setWatchStatuses((prev) => ({
          ...prev,
          [id]: {
            isWatched: true,
            watchCount: (prev[id]?.watchCount ?? 0) + 1,
            starsAwarded: videoType !== 'replay',
          },
        }));
      }
    },
    [selected, getExploreVideoWatchStatus, videoType]
  );

  const videoForModal: ExploreVideoInput | null = useMemo(() => {
    if (!selected) return null;
    return {
      _id: selected.videoFile?._id ?? selected._id,
      title: selected.title,
      url: getVideoFileUrl(selected),
    };
  }, [selected, getVideoFileUrl]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <ThemedText style={styles.loadingText}>Loading videos...</ThemedText>
      </View>
    );
  }

  if (!videos.length) {
    return <ContentsEmpty />;
  }

  return (
    <>
      <View style={styles.grid}>
        {videos.map((v) => {
          const id = String(v._id ?? '');
          const cover = getCoverImageUrl(v.coverImage);
          const duration = formatDuration(v.duration);
          const watched = watchStatuses[id]?.isWatched ?? false;
          const description = truncateDescription(v.description);

          return (
            <Pressable
              key={id}
              onPress={() => handleOpen(v)}
              accessibilityRole="button"
              accessibilityLabel={`${v.title}, ${watched ? 'Review' : 'Start'} lesson`}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <View style={styles.coverWrap}>
                {cover ? (
                  <Image
                    source={{ uri: cover }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    accessibilityLabel={v.title}
                  />
                ) : (
                  <View style={styles.coverPlaceholder} />
                )}

                {watched && (
                  <View style={styles.completionBadge} accessibilityLabel="Completed">
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color={colors.secondary}
                    />
                  </View>
                )}

                <View style={styles.durationBadge}>
                  <ThemedText style={styles.durationText}>{duration}</ThemedText>
                </View>
              </View>

              <View style={styles.body}>
                <ThemedText style={styles.title} numberOfLines={2}>
                  {v.title || 'Untitled Video'}
                </ThemedText>
                {description ? (
                  <ThemedText
                    style={styles.description}
                    numberOfLines={2}>
                    {description}
                  </ThemedText>
                ) : null}
                <View
                  style={[
                    styles.ctaBtn,
                    watched ? styles.ctaBtnReview : styles.ctaBtnStart,
                  ]}>
                  <ThemedText style={styles.ctaBtnText}>
                    {watched ? 'Review Lesson' : 'Start Lesson'}
                  </ThemedText>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {videoForModal && (
        <VideoPlayerModal
          open={modalOpen}
          onClose={handleClose}
          video={videoForModal}
          childId={childId}
          isExploreVideo
          exploreContentId={selected?._id}
          videoType={videoType}
          onVideoComplete={handleVideoComplete}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: spacing[10],
    alignItems: 'center',
    gap: spacing[4],
    minHeight: 200,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing[4],
    columnGap: spacing[4],
  },
  card: {
    width: '100%',
    minWidth: 160,
    backgroundColor: colors.bgCard,
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.95,
  },
  coverWrap: {
    width: '100%',
    height: 192,
    backgroundColor: colors.bgSecondary,
    position: 'relative',
  },
  coverPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgTertiary,
  },
  completionBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 22,
  },
  durationText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textInverse,
  },
  body: {
    padding: spacing[4],
    gap: spacing[3],
  },
  title: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    
    color: colors.secondary,
    lineHeight: 20,
  },
  description: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    lineHeight: 20,
    minHeight: 40,
  },
  ctaBtn: {
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnStart: {
    backgroundColor: colors.accent,
  },
  ctaBtnReview: {
    backgroundColor: colors.secondary,
  },
  ctaBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textInverse,
  },
});
