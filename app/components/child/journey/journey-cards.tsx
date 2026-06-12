/**
 * Journey cards grid – completed, in progress, and locked course cards.
 * Mirrors frontend ChildJourneyCards (3 states: completed, in progress, locked).
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import type { ChildCourseWithProgress } from '@/services/journeyService';

import { API_BASE_URL } from '@/config';

const FOOTSTEPS_IMAGE = require('@/assets/images/footsteps.png');
const LOCK_IMAGE = require('@/assets/icons/lock.png');

type CardStatus = 'completed' | 'in_progress' | 'not_started' | 'locked';

function getBorderColor(status: CardStatus): string {
  switch (status) {
    case 'completed':
      return colors.secondary;
    case 'in_progress':
    case 'not_started':
      return colors.accent;
    case 'locked':
      return 'rgb(212, 230, 227)';
    default:
      return colors.bgSecondary;
  }
}

function getIconBorderColor(status: CardStatus): string {
  switch (status) {
    case 'completed':
      return colors.secondary;
    case 'in_progress':
    case 'not_started':
      return colors.accent;
    case 'locked':
      return colors.orange;
    default:
      return colors.border;
  }
}

function getStepBadgeBackground(status: CardStatus): string {
  switch (status) {
    case 'in_progress':
    case 'not_started':
      return colors.accent;
    case 'completed':
      return colors.primary;
    case 'locked':
      return colors.bgTertiary;
    default:
      return colors.bgTertiary;
  }
}

function getCoverImageUrl(coverImagePath?: string | null, coverImage?: string | null): string | null {
  const path = coverImagePath ?? coverImage ?? null;
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

function truncateDescription(text: string | undefined, maxLength: number = 50): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

const CARD_GAP = spacing[4];
const MAX_CONTENT_WIDTH = 848;
const STATUS_ICON_SIZE = 24;
const STATUS_ICON_WRAP = 40;
const LOCK_WRAP = 92;

export interface JourneyCardsProps {
  courses: ChildCourseWithProgress[];
  childId: string;
}

export function JourneyCards({ courses, childId }: JourneyCardsProps) {
  const router = useRouter();

  if (courses.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <ThemedText style={styles.emptyText}>
          No courses available yet. Check back soon!
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {courses.map((courseItem, index) => {
        const course = courseItem.course ?? ({} as ChildCourseWithProgress['course']);
        const status = (courseItem.status ?? 'not_started') as CardStatus;
        const isLocked = status === 'locked';
        const stepOrder = index + 1;
        const coverUrl = getCoverImageUrl(
          course.coverImagePath ?? null,
          (course as { coverImage?: string }).coverImage ?? null
        );
        const courseId = course._id;

        const handlePress = () => {
          if (isLocked || !childId || !courseId) return;
          if (status === 'completed' || status === 'in_progress' || status === 'not_started') {
            router.push(`/child/${childId}/module?courseId=${courseId}` as never);
          }
        };

        return (
          <Pressable
            key={course._id}
            onPress={handlePress}
            disabled={isLocked}
            style={({ pressed }) => [
              styles.card,
              { borderColor: getBorderColor(status) },
              isLocked && styles.cardLocked,
              pressed && !isLocked && styles.cardPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: isLocked }}
            accessibilityLabel={
              isLocked
                ? `Locked step ${stepOrder}. Complete previous steps to unlock.`
                : `${course.title ?? 'Course'}, Step ${stepOrder}, ${status}.`
            }>
            {/* Image / cover area */}
            <View style={[styles.imageContainer, isLocked && styles.imageContainerLocked]}>
              {coverUrl ? (
                <Image
                  source={{ uri: coverUrl }}
                  style={styles.coverImage}
                  resizeMode="cover"
                  accessibilityLabel={course.title ? `${course.title} cover` : 'Course cover'}
                />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <ThemedText style={styles.coverPlaceholderEmoji}>📚</ThemedText>
                </View>
              )}
              {isLocked ? (
                <View style={styles.lockOverlay}>
                  <View style={styles.lockIconWrap}>
                    <Image
                      source={LOCK_IMAGE}
                      style={styles.lockImage}
                      resizeMode="contain"
                      accessibilityLabel="Locked journey step"
                    />
                  </View>
                </View>
              ) : (
                <>
                  {/* Status icon – top left */}
                  {(status === 'completed' || status === 'in_progress' || status === 'not_started') && (
                    <View style={styles.statusIconWrap}>
                      {status === 'completed' ? (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={STATUS_ICON_SIZE}
                          color={colors.primary}
                        />
                      ) : (
                        <MaterialCommunityIcons
                          name="star"
                          size={STATUS_ICON_SIZE}
                          color={colors.accent}
                        />
                      )}
                    </View>
                  )}
                  {/* Step badge – top right */}
                  <View style={[styles.stepBadge, { backgroundColor: getStepBadgeBackground(status) }]}>
                    <ThemedText style={styles.stepBadgeText}>Step {stepOrder}</ThemedText>
                  </View>
                </>
              )}
            </View>

            {/* Card content: icon + title + description */}
            <View style={styles.content}>
              <View style={[styles.footstepsWrap, { borderColor: getIconBorderColor(status), backgroundColor: getIconBorderColor(status) }]}>
                <Image
                  source={isLocked ? LOCK_IMAGE : FOOTSTEPS_IMAGE}
                  style={isLocked ? styles.lockFootstepImage : styles.footstepsImage}
                  resizeMode="contain"
                  accessibilityLabel={isLocked ? 'Locked step icon' : 'Footsteps icon'}
                  accessibilityIgnoresInvertColors
                />
              </View>
              <View style={styles.textWrap}>
                <ThemedText style={styles.title} numberOfLines={2}>
                  {isLocked ? 'Locked Step' : (course.title ?? 'Untitled Course')}
                </ThemedText>
                <ThemedText
                  style={styles.description}
                  numberOfLines={2}
                  ellipsizeMode="tail">
                  {isLocked
                    ? 'Complete previous weeks to unlock'
                    : truncateDescription(course.description, 50)}
                </ThemedText>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    gap: CARD_GAP,
  },
  card: {
    width: '85%',
    backgroundColor: colors.bgCard,
    borderWidth: 3,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    margin: 'auto'
  },
  cardLocked: {
    opacity: 1,
  },
  cardPressed: {
    opacity: 0.92,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.bgTertiary,
    overflow: 'hidden',
    position: 'relative',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  imageContainerLocked: {
    backgroundColor: '#000',
  },
  coverImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textMuted,
  },
  coverPlaceholderEmoji: {
    fontSize: 48,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconWrap: {
    width: LOCK_WRAP,
    height: LOCK_WRAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockImage: {
    width: '100%',
    height: '100%',
  },
  statusIconWrap: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    width: STATUS_ICON_WRAP,
    height: STATUS_ICON_WRAP,
    borderRadius: STATUS_ICON_WRAP / 2,
    backgroundColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  stepBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    paddingVertical: 4,
    paddingHorizontal: spacing[3],
    borderRadius: 16,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textInverse,
  },
  content: {
    flexDirection: 'row',
    padding: spacing[5],
    gap: spacing[4],
  },
  footstepsWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 0.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footstepsImage: {
    width: 40,
    height: 40,
  },
  lockFootstepImage: {
    width: 34,
    height: 34,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: 'rgb(153, 153, 153)',
    lineHeight: 21,
    fontWeight: '500',
  },
  emptyWrap: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[5],
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textInverse,
    fontSize: 18,
    textAlign: 'center',
  },
});
