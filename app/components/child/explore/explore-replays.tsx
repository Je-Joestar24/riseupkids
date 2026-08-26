/**
 * Explore Replays
 * "Watch Replays" section: horizontal list of replay cards + video player modal
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ExploreVideoPlayerModal } from '@/components/child/common/explore-video-player-modal';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useExplore, useExploreVideoWatch } from '@/hooks/exploreHook';
import type { ExploreContentItem } from '@/services/exploreService';
import { exploreCacheKey, useExploreStore } from '@/store/exploreStore';
import { useOnNetworkReconnect } from '@/hooks/useOnNetworkReconnect';
import { isNetworkError, toFriendlyLoadError } from '@/utils/networkError';
import { ExploreReplaysSkeleton } from './explore-skeletal-loading';
import { ExploreReplaysCard } from './explore-replays-card';

export interface ExploreReplaysProps {
  childId: string | null;
}

export function ExploreReplays({ childId }: ExploreReplaysProps) {
  const router = useRouter();
  const { fetchByType, getCoverImageUrl, isLoadingByType } = useExplore();
  const { getExploreVideoWatchStatus } = useExploreVideoWatch(childId);

  const cacheKey = { videoType: 'replay', page: 1, limit: 4 };
  const loading = isLoadingByType('video', cacheKey);
  const loadedRef = useRef(false);
  const [replayContent, setReplayContent] = useState<ExploreContentItem[]>(() =>
    useExploreStore.getState().getCachedByType(exploreCacheKey('video', cacheKey))
  );
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [selectedContent, setSelectedContent] = useState<ExploreContentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(
    () =>
      useExploreStore.getState().getCachedByType(exploreCacheKey('video', cacheKey))
        .length === 0
  );
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (loadedRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchByType('video', { ...cacheKey });
        if (cancelled) return;
        setReplayContent(Array.isArray(list) ? list : []);
        setError(null);
        loadedRef.current = true;
      } catch (err) {
        if (cancelled) return;
        const cached = useExploreStore
          .getState()
          .getCachedByType(exploreCacheKey('video', cacheKey));
        if (cached.length) return;
        setError(toFriendlyLoadError(err));
      } finally {
        if (!cancelled) setIsInitialLoad(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchByType, retryKey]);

  useEffect(() => {
    if (!childId || replayContent.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        replayContent.map(async (c) => {
          const id = c._id?.toString?.() ?? '';
          if (!id) return ['', 0] as const;
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
      entries.forEach(([id, count]) => {
        if (id) map[id] = count;
      });
      setViewCounts((prev) => ({ ...prev, ...map }));
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

  useOnNetworkReconnect(() => {
    loadedRef.current = false;
    setIsInitialLoad(true);
    setError(null);
    setRetryKey((n) => n + 1);
  });

  const showReplaysSkeleton =
    (isInitialLoad || loading || isNetworkError(error)) && replayContent.length === 0;

  if (showReplaysSkeleton) {
    return <ExploreReplaysSkeleton />;
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
      {selectedContent ? (
        <ExploreVideoPlayerModal
          open={modalOpen}
          onClose={handleCloseModal}
          content={selectedContent}
          childId={childId}
          videoType="replay"
          onVideoComplete={handleVideoComplete}
        />
      ) : null}
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
});
