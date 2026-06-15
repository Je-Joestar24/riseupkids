/**
 * Child Kid's Wall (feed)
 * Show & Tell feed: header, share CTA, post cards (single column), footer.
 * Uses useKidsWall(childId) for feed, like/star, and share flow.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { WallCards } from '@/components/child/wall/wall-cards';
import { WallCardsSkeleton } from '@/components/child/wall/wall-skeletal-loading';
import { WallFooter } from '@/components/child/wall/wall-footer';
import { WallHeader } from '@/components/child/wall/wall-header';
import { WallShareSomething } from '@/components/child/wall/wall-sharesomething';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useKidsWall } from '@/hooks/kidswallHook';

export default function ChildWallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const childId = id ?? null;

  const wall = useKidsWall(childId ?? undefined);
  const {
    posts,
    loading,
    error,
    fetchFeed,
    clearError,
    getPostImageUrl,
  } = wall;

  const toggleLike = childId && 'toggleLike' in wall ? wall.toggleLike : undefined;
  const toggleStar = childId && 'toggleStar' in wall ? wall.toggleStar : undefined;
  const loadingMutation = childId && 'loadingMutation' in wall ? wall.loadingMutation : false;

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleSharePress = useCallback(() => {
    if (!childId) return;
    router.push(`/child/${childId}/wall/share` as never);
  }, [childId, router]);

  const handleToggleLike = useCallback(
    (postId: string) => {
      toggleLike?.(postId).catch(() => {});
    },
    [toggleLike]
  );

  const handleToggleStar = useCallback(
    (postId: string) => {
      toggleStar?.(postId).catch(() => {});
    },
    [toggleStar]
  );

  if (error) {
    return (
      <View style={styles.center}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <ThemedText
          style={styles.retryText}
          onPress={() => { clearError(); fetchFeed(); }}>
          Tap to retry
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <WallHeader />
        {childId ? (
          <WallShareSomething
            onSharePress={handleSharePress}
            loading={loadingMutation}
          />
        ) : null}
        {loading ? (
          <WallCardsSkeleton />
        ) : (
          <WallCards
            posts={posts}
            currentChildId={childId ?? undefined}
            getPostImageUrl={getPostImageUrl}
            onToggleLike={handleToggleLike}
            onToggleStar={handleToggleStar}
          />
        )}
        <WallFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4EDD8',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[12],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: colors.secondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.textInverse,
    textAlign: 'center',
  },
  retryText: {
    marginTop: spacing[2],
    fontSize: 14,
    color: colors.accent,
    textDecorationLine: 'underline',
  },
});
