/**
 * Explore Replays Card
 * Single replay video card: cover, play overlay, duration, title, view count, Watch Now
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import type { ExploreContentItem } from '@/services/exploreService';

export interface ExploreReplaysCardProps {
  content: ExploreContentItem & { viewCount?: number };
  coverImageUrl: string | null;
  onWatchPress: () => void;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  return `${mins} min`;
}

function formatViewCount(count: number): string {
  if (!count) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function ExploreReplaysCard({
  content,
  coverImageUrl,
  onWatchPress,
}: ExploreReplaysCardProps) {
  const viewCount = content.viewCount ?? 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onWatchPress}
      accessibilityRole="button"
      accessibilityLabel={`Watch ${content.title}`}>
      <View style={styles.coverWrap}>
        {coverImageUrl ? (
          <Image
            source={{ uri: coverImageUrl }}
            style={styles.cover}
            resizeMode="cover"
            accessibilityLabel={content.title}
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <MaterialCommunityIcons
              name="play-circle"
              size={48}
              color={colors.secondary}
            />
          </View>
        )}
        <View style={styles.playOverlay}>
          <MaterialCommunityIcons name="play" size={32} color={colors.secondary} />
        </View>
        {content.duration ? (
          <View style={styles.durationBadge}>
            <ThemedText style={styles.durationText}>
              {formatDuration(content.duration)}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {content.title}
        </ThemedText>
        <View style={styles.footer}>
          <View style={styles.viewsRow}>
            <MaterialCommunityIcons
              name="play-circle-outline"
              size={16}
              color={colors.textMuted}
            />
            <ThemedText style={styles.viewsText}>
              {formatViewCount(viewCount)} views
            </ThemedText>
          </View>
          <View style={styles.watchBtn}>
            <ThemedText style={styles.watchBtnText}>Watch Now</ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const CARD_WIDTH = 288;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    flexShrink: 0,
    backgroundColor: colors.bgCard,
    borderRadius: 0,
    overflow: 'hidden',
    marginRight: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.95,
  },
  coverWrap: {
    width: '100%',
    height: 160,
    backgroundColor: colors.bgSecondary,
    position: 'relative',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
    color: colors.textInverse,
  },
  body: {
    padding: spacing[5],
    gap: spacing[2],
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: '700',
    color: colors.secondary,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  viewsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  viewsText: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  watchBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[5],
  },
  watchBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
