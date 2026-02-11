/**
 * Replays Cards (Explore → Replays)
 * Mirrors web ExploreReplaysCards: grid of replay videos with cover, duration, views, watch.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { VideoPlayerModal } from '@/components/child/common/video-player-modal';
import type { ExploreVideoInput } from '@/components/child/common/video-player-modal';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useExplore, useExploreVideoWatch } from '@/hooks/exploreHook';
import type { ExploreContentItem } from '@/services/exploreService';

export interface ReplaysCardsProps {
  childId: string;
}

function formatDuration(seconds: number | null | undefined): string {
  const s = Number(seconds ?? 0);
  const mins = Math.ceil(s / 60);
  return `${Math.max(0, mins)} min`;
}

function formatViewCount(count: number): string {
  if (!count) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function ReplaysCards({ childId }: ReplaysCardsProps) {
  const { fetchByType, getCoverImageUrl, getVideoFileUrl } = useExplore();
  const { getExploreVideoWatchStatus } = useExploreVideoWatch(childId);

  const [videos, setVideos] = useState<ExploreContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

  const [selected, setSelected] = useState<ExploreContentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchByType('video', { videoType: 'replay', page: 1, limit: 60 });
        if (cancelled) return;
        setVideos(Array.isArray(list) ? list : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchByType]);

  useEffect(() => {
    if (!childId || videos.length === 0) return;
    let cancelled = false;
    (async () => {
      const pairs = await Promise.all(
        videos.map(async (v) => {
          const id = String(v._id ?? '');
          if (!id) return [id, 0] as const;
          try {
            const status = await getExploreVideoWatchStatus(id);
            return [id, status?.currentWatchCount ?? 0] as const;
          } catch {
            return [id, 0] as const;
          }
        })
      );
      if (cancelled) return;
      const map: Record<string, number> = {};
      pairs.forEach(([id, c]) => {
        if (id) map[id] = c;
      });
      setViewCounts(map);
    })();
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

  const handleVideoComplete = useCallback(async () => {
    if (!selected?._id) return;
    try {
      const status = await getExploreVideoWatchStatus(String(selected._id));
      setViewCounts((prev) => ({ ...prev, [String(selected._id)]: status?.currentWatchCount ?? 0 }));
    } catch {
      // ignore
    }
  }, [selected, getExploreVideoWatchStatus]);

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
        <ThemedText style={styles.loadingText}>Loading replays...</ThemedText>
      </View>
    );
  }

  if (!videos.length) {
    return (
      <View style={styles.emptyWrap}>
        <ThemedText style={styles.emptyText}>No replays available yet.</ThemedText>
      </View>
    );
  }

  return (
    <>
      <View style={styles.grid}>
        {videos.map((v) => {
          const id = String(v._id ?? '');
          const cover = getCoverImageUrl(v.coverImage);
          const views = formatViewCount(viewCounts[id] ?? 0);
          const duration = v.duration ? formatDuration(v.duration) : null;

          return (
            <Pressable
              key={id}
              onPress={() => handleOpen(v)}
              accessibilityRole="button"
              accessibilityLabel={`Watch ${v.title}`}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}>
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

                <View style={styles.playOverlay}>
                  <MaterialCommunityIcons name="play" size={32} color={colors.secondary} />
                </View>

                {duration ? (
                  <View style={styles.durationBadge}>
                    <ThemedText style={styles.durationText}>{duration}</ThemedText>
                  </View>
                ) : null}
              </View>

              <View style={styles.body}>
                <ThemedText style={styles.title} numberOfLines={2}>
                  {v.title}
                </ThemedText>

                <View style={styles.footerRow}>
                  <View style={styles.viewsRow}>
                    <MaterialCommunityIcons
                      name="play-circle-outline"
                      size={16}
                      color={colors.textMuted}
                    />
                    <ThemedText style={styles.viewsText}>{views} views</ThemedText>
                  </View>
                  <View style={styles.watchBtn}>
                    <ThemedText style={styles.watchBtnText}>Watch Now</ThemedText>
                  </View>
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
          videoType="replay"
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
  },
  loadingText: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  emptyWrap: {
    paddingVertical: spacing[10],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    textAlign: 'center',
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
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  coverWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.bgSecondary,
    position: 'relative',
  },
  coverPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bgTertiary,
  },
  playOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -32,
    marginTop: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing[2],
    right: spacing[2],
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 12,
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
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.secondary,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  viewsText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textMuted,
  },
  watchBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  watchBtnText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textInverse,
  },
});

