/**
 * Kids Wall Cards (App)
 * Single-column list of post cards: square image, avatar (emoji), name/age, title, content, like + star.
 * Matches web KidsWallCards; mobile single-column layout.
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import type { KidsWallPost, KidsWallImage, KidsWallChildRef } from '@/services/kidswallService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EMOJI_LIST = [
  '🎨', '🎭', '🎪', '🎯', '🎲', '🎮', '🎸', '🎺', '🎻', '🎤', '🎧', '🎬', '🎥', '📷', '📸',
  '📚', '📖', '💡', '✏️', '🖍️', '📝', '🌟', '⭐', '🌈', '🦋', '🌸', '🌻', '🐝', '🦄',
];

function getEmojiForPost(postId: string): string {
  if (!postId) return EMOJI_LIST[0];
  const index = postId.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) % EMOJI_LIST.length;
  return EMOJI_LIST[index];
}

function getChildDisplay(post: KidsWallPost): { name: string; age: number | null } {
  const child = post.child;
  if (!child) return { name: 'Child', age: null };
  if (typeof child === 'string') return { name: 'Child', age: null };
  const c = child as KidsWallChildRef;
  return {
    name: c.displayName ?? 'Child',
    age: typeof c.age === 'number' ? c.age : null,
  };
}

function getLikeCount(post: KidsWallPost): number {
  return post.likes?.length ?? 0;
}

function isLikedByChild(post: KidsWallPost, currentChildId: string | null | undefined): boolean {
  if (!currentChildId || !post.likes?.length) return false;
  return post.likes.some((like) => {
    const id = typeof like.child === 'string' ? like.child : (like.child as KidsWallChildRef)?._id;
    return id?.toString() === currentChildId.toString();
  });
}

function isStarredByChild(post: KidsWallPost, currentChildId: string | null | undefined): boolean {
  if (!currentChildId || !post.stars?.length) return false;
  return post.stars.some((star) => {
    const id = typeof star.child === 'string' ? star.child : (star.child as KidsWallChildRef)?._id;
    return id?.toString() === currentChildId.toString();
  });
}

export interface WallCardsProps {
  posts: KidsWallPost[];
  currentChildId?: string | null;
  getPostImageUrl: (img: KidsWallImage | null | undefined) => string | null;
  onToggleLike?: (postId: string) => void | Promise<unknown>;
  onToggleStar?: (postId: string) => void | Promise<unknown>;
}

export function WallCards({
  posts,
  currentChildId,
  getPostImageUrl,
  onToggleLike,
  onToggleStar,
}: WallCardsProps) {
  const { width } = useWindowDimensions();
  const imageSize = width; // full width for single column

  const handleLike = useCallback(
    (postId: string) => {
      onToggleLike?.(postId);
    },
    [onToggleLike]
  );

  const handleStar = useCallback(
    (postId: string) => {
      onToggleStar?.(postId);
    },
    [onToggleStar]
  );

  if (!posts.length) return null;

  return (
    <View style={styles.list}>
      {posts.map((post) => {
        const image = post.images?.[0];
        const imageUrl = image ? getPostImageUrl(image) : null;
        const { name: childName, age: childAge } = getChildDisplay(post);
        const emoji = getEmojiForPost(post._id);
        const likeCount = getLikeCount(post);
        const isLiked = isLikedByChild(post, currentChildId);
        const isStarred = isStarredByChild(post, currentChildId);

        return (
          <View key={post._id} style={styles.card}>
            {imageUrl ? (
              <View style={[styles.imageWrap, { width: imageSize, height: imageSize }]}>
                <Image
                  source={{ uri: imageUrl }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  accessibilityLabel={post.title || 'Post image'}
                />
              </View>
            ) : null}

            <View style={styles.body}>
              <View style={styles.metaRow}>
                <View style={styles.avatar}>
                  <ThemedText style={styles.avatarEmoji}>{emoji}</ThemedText>
                </View>
                <View style={styles.nameWrap}>
                  <ThemedText style={styles.childName}>{childName}</ThemedText>
                  {childAge != null && (
                    <ThemedText style={styles.childAge}>Age {childAge}</ThemedText>
                  )}
                </View>
              </View>

              <ThemedText style={styles.title} numberOfLines={2}>
                {post.title}
              </ThemedText>
              <ThemedText style={styles.content} numberOfLines={4}>
                {post.content}
              </ThemedText>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => handleLike(post._id)}
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
                  accessibilityState={{ selected: isLiked }}>
                  <MaterialCommunityIcons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={20}
                    color={isLiked ? colors.orange : colors.textMuted}
                  />
                  <ThemedText
                    style={[styles.actionCount, isLiked && styles.actionCountLiked]}>
                    {likeCount}
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => handleStar(post._id)}
                  style={({ pressed }) => [
                    styles.greatBtn,
                    isStarred && styles.greatBtnStarred,
                    pressed && styles.actionBtnPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={isStarred ? 'Unstar' : 'Star as great'}
                  accessibilityState={{ selected: isStarred }}>
                  <MaterialCommunityIcons
                    name="star"
                    size={18}
                    color={isStarred ? colors.textInverse : colors.textMuted}
                  />
                  <ThemedText
                    style={[styles.greatBtnText, isStarred && styles.greatBtnTextStarred]}>
                    Great!
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing[6],
    marginBottom: spacing[8],
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'column',
  },
  imageWrap: {
    backgroundColor: colors.bgSecondary,
    position: 'relative',
  },
  body: {
    padding: spacing[4],
    flexDirection: 'column',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgb(253, 232, 222)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 18,
  },
  nameWrap: {
    flex: 1,
  },
  childName: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.sm,
    color: colors.secondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.tight,
  },
  childAge: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    lineHeight: typography.sizes.xs * typography.lineHeights.tight,
  },
  title: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.base,
    color: colors.secondary,
    marginBottom: spacing[2],
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
  },
  content: {
    fontFamily: 'Quicksand_400Regular',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    marginBottom: spacing[3],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    padding: spacing[1],
  },
  actionBtnPressed: {
    opacity: 0.8,
  },
  actionCount: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  actionCountLiked: {
    color: colors.orange,
  },
  greatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    backgroundColor: colors.bgTertiary,
    borderRadius: 4,
  },
  greatBtnStarred: {
    backgroundColor: colors.accent,
  },
  greatBtnText: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  greatBtnTextStarred: {
    color: colors.textInverse,
  },
});
