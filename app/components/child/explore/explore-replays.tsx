/**
 * Explore Replays
 * "Watch Replays" section: horizontal list of replay cards + video player modal
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { VideoPlayerModal } from '@/components/child/common/video-player-modal';
import type { ExploreVideoInput } from '@/components/child/common/video-player-modal';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useExplore, useExploreVideoWatch } from '@/hooks/exploreHook';
import type { ExploreContentItem } from '@/services/exploreService';
import { ExploreReplaysCard } from './explore-replays-card';

export interface ExploreReplaysProps {
  childId: string | null;
}

export function ExploreReplays({ childId }: ExploreReplaysProps) {
  const router = useRouter();
  const { fetchByType, getCoverImageUrl, getVideoFileUrl, isLoadingByType } = useExplore();
  const { getExploreVideoWatchStatus } = useExploreVideoWatch(childId);

  const [replayContent, setReplayContent] = useState<ExploreContentItem[]>([]);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [selectedContent, setSelectedContent] = useState<ExploreContentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const loadedRef = useRef(false);

  const cacheKey = { videoType: 'replay', page: 1, limit: 4 };
  const loading = isLoadingByType('video', cacheKey);

  useEffect(() => {
    if (loadedRef.current) return;
    let cancelled = false;
    (async () => {
      const list = await fetchByType('video', { ...cacheKey });
      if (cancelled) return;
      setReplayContent(Array.isArray(list) ? list : []);
      loadedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchByType]);

  useEffect(() => {
    if (!childId || replayContent.length === 0) return;
    let cancelled = false;
    (async () => {
      const map: Record<string, number> = {};
      for (const c of replayContent) {
        const id = c._id?.toString?.() ?? '';
        if (!id) continue;
        try {
          const status = await getExploreVideoWatchStatus(id);
          if (cancelled) return;
          map[id] = status?.currentWatchCount ?? 0;
        } catch {
          map[id] = 0;
        }
      }
      if (!cancelled) setViewCounts((prev) => ({ ...prev, ...map }));
    })();
    return () => {
      cancelled = true;
    };
  }, [childId, replayContent, getExploreVideoWatchStatus]);

  const handleWatchPress = useCallback((content: ExploreContentItem) => {
    setSelectedContent(content);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedContent(null);
  }, []);

  const handleVideoComplete = useCallback(async () => {
    const id = selectedContent?._id?.toString?.();
    if (id && childId) {
      try {
        const status = await getExploreVideoWatchStatus(id);
        setViewCounts((prev) => ({ ...prev, [id]: status?.currentWatchCount ?? 0 }));
      } catch {
        // ignore
      }
    }
  }, [selectedContent, childId, getExploreVideoWatchStatus]);

  const videoForModal: ExploreVideoInput | null = selectedContent
    ? {
        _id: selectedContent.videoFile?._id ?? selectedContent._id,
        title: selectedContent.title,
        url: getVideoFileUrl(selectedContent),
      }
    : null;

  if (loading && replayContent.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <ThemedText style={styles.loadingText}>Loading replays...</ThemedText>
      </View>
    );
  }

  if (!replayContent.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.playBadge}>
            <ThemedText style={styles.playBadgeText}>▶</ThemedText>
          </View>
          <ThemedText style={styles.sectionTitle}>Watch Replays</ThemedText>
        </View>
        {childId ? (
          <Pressable
            onPress={() => router.push(`/child/${childId}/replays` as never)}
            accessibilityRole="button"
            accessibilityLabel="View all replays"
            hitSlop={10}
            style={({ pressed }) => [styles.viewAllBtn, pressed && { opacity: 0.85 }]}>
            <ThemedText style={styles.viewAllText}>View all →</ThemedText>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}>
        {replayContent.map((content) => (
          <ExploreReplaysCard
            key={content._id}
            content={{
              ...content,
              viewCount: viewCounts[content._id?.toString() ?? ''] ?? 0,
            }}
            coverImageUrl={getCoverImageUrl(content.coverImage)}
            onWatchPress={() => handleWatchPress(content)}
          />
        ))}
      </ScrollView>
      {videoForModal && (
        <VideoPlayerModal
          open={modalOpen}
          onClose={handleCloseModal}
          video={videoForModal}
          childId={childId}
          isExploreVideo
          exploreContentId={selectedContent?._id}
          videoType="replay"
          onVideoComplete={handleVideoComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing[6],
    marginTop: spacing[6],	
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  playBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1],
    borderRadius: 4,
  },
  playBadgeText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textInverse,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
  },
  viewAllBtn: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.orange,
  },
  scroll: {
    marginHorizontal: -spacing[4],
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  loadingWrap: {
    paddingVertical: spacing[8],
    alignItems: 'center',
    gap: spacing[4],
  },
  loadingText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
});
