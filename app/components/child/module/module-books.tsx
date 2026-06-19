/**
 * Module Library – books in a 2-column grid with square covers.
 * Each card: square cover, completion check, star badge, time, 5 progress circles.
 *
 * Taps call `onBookPress(book)`; the parent screen should open HTML5, built-in CMS, etc.
 * (Built-in detection uses `packageType === 'builtin'` + `cmsBookId` — see `module-utils`.)
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import type { PopulatedContentItem } from '@/services/moduleService';
import { getCoverImageUrl } from '@/components/child/module/module-utils';

const CARD_GAP = spacing[4];
const CARD_WIDTH_PCT = '48%';
const CIRCLE_SIZE = 28;

export interface ModuleBooksProps {
  books: PopulatedContentItem[];
  getProgressCircles: (book: PopulatedContentItem) => number;
  isCompleted: (book: PopulatedContentItem) => boolean;
  getStarPoints?: (book: PopulatedContentItem) => number;
  onBookPress?: (book: PopulatedContentItem) => void;
}

function BookCard({
  book,
  progressCircles,
  isCompleted: completed,
  starPoints,
  onPress,
}: {
  book: PopulatedContentItem;
  progressCircles: number;
  isCompleted: boolean;
  starPoints: number;
  onPress: () => void;
}) {
  const coverUrl = getCoverImageUrl(book.coverImage ?? undefined);
  const timeMin = Number(book.estimatedReadingTime ?? book.estimatedTime ?? book.duration ?? 0);
  const timeLabel = timeMin > 0 ? `${timeMin} min` : '0 min';
  const statusLabel = completed ? 'Completed' : 'Not completed';
  const a11yLabel = book.title ? `${book.title}, ${statusLabel}` : statusLabel;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}>
      <View style={styles.squareWrap}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            accessibilityLabel={book.title ? `${book.title} cover` : 'Book cover'}
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
      <View style={styles.circlesRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.circle,
              i < progressCircles && styles.circleFilled,
            ]}>
            {i < progressCircles && (
              <MaterialCommunityIcons name="check" size={18} color={colors.textInverse} />
            )}
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export function ModuleBooks({
  books,
  getProgressCircles,
  isCompleted,
  getStarPoints = () => 0,
  onBookPress,
}: ModuleBooksProps) {
  if (!books?.length) {
    return (
      <View style={styles.section}>
        <ThemedText style={styles.emptyText}>No books in this course.</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>Library</ThemedText>
      <View style={styles.grid}>
        {books.map((book, index) => (
          <View key={book._id ?? book._contentId ?? index} style={styles.cardWrap}>
            <BookCard
              book={book}
              progressCircles={getProgressCircles(book)}
              isCompleted={isCompleted(book)}
              starPoints={getStarPoints(book)}
              onPress={() => onBookPress?.(book)}
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
  circlesRow: {
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFilled: {
    backgroundColor: colors.orange,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing[8],
  },
});
