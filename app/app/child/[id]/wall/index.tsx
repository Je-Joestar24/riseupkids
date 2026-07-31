/**
 * Child Kid's Wall (feed)
 * Show & Tell feed: header, share CTA, post cards (single column), footer.
 * Uses useKidsWall(childId) for feed, like/star, and share flow.
 * iOS (or preview env): Coming Soon artwork instead of the live wall.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { WallCards } from '@/components/child/wall/wall-cards';
import { WallComingSoon } from '@/components/child/wall/wall-coming-soon';
import { WallCardsSkeleton } from '@/components/child/wall/wall-skeletal-loading';
import { WallFooter } from '@/components/child/wall/wall-footer';
import { WallHeader } from '@/components/child/wall/wall-header';
import { WallShareSomething } from '@/components/child/wall/wall-sharesomething';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useChildProfile } from '@/hooks/childProfileHook';
import { useKidsWall } from '@/hooks/kidswallHook';
import { isKidsWallComingSoon } from '@/utils/kidsWallComingSoon';

export default function ChildWallScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const childId = id ?? null;
  const comingSoon = isKidsWallComingSoon();
  const { kidsWallEnabled, loading: profileLoading } = useChildProfile(
    comingSoon ? null : childId
  );

  const wall = useKidsWall(comingSoon ? undefined : childId ?? undefined);
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
    if (comingSoon) return;
    fetchFeed();
  }, [comingSoon, fetchFeed]);

  const handleSharePress = useCallback(() => {
    if (!childId || !kidsWallEnabled) return;
    router.push(`/child/${childId}/wall/share` as never);
  }, [childId, kidsWallEnabled, router]);

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

  if (comingSoon) {
    return <WallComingSoon />;
  }

  if (profileLoading) {
    return (
      <View style={styles.center}>
        <WallCardsSkeleton />
      </View>
    );
  }

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
            uploadEnabled={kidsWallEnabled}
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
