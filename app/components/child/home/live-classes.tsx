/**
 * Live Classes (Child Home)
 * Shows "Live now" (YouTube) and "Next Live Class" (Meeting)
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { homeService } from '@/services/homeService';

const LIVE_ICON = require('@/assets/images/live.png');
const LIVE_CLASS_IMAGE = require('@/assets/images/liveclass.jpeg');

type Meeting = any;
type YouTubeLive = any;

export interface LiveClassesProps {
  loading?: boolean;
  nextMeeting: Meeting | null;
  activeLive: YouTubeLive | null;
}

function formatMeetingDate(dateString?: string | null) {
  if (!dateString) return 'TBD';
  const meetingDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const meetingDay = new Date(meetingDate);
  meetingDay.setHours(0, 0, 0, 0);

  if (meetingDay.getTime() === today.getTime()) return 'Today';
  if (meetingDay.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return meetingDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: meetingDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function formatMeetingTime(dateString?: string | null) {
  if (!dateString) return 'TBD';
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

async function openExternal(url?: string | null) {
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch {
    // noop
  }
}

export function LiveClasses({ loading, nextMeeting, activeLive }: LiveClassesProps) {
  const hasAny = !!activeLive || !!nextMeeting;

  const liveUrl = useMemo(() => {
    const embedUrl = activeLive?.embedUrl as string | undefined;
    const watchUrl = activeLive?.watchUrl as string | undefined;
    return embedUrl || watchUrl || null;
  }, [activeLive]);

  if (!hasAny && !loading) return null;

  return (
    <View style={styles.wrap}>
      {/* Live now */}
      {!!activeLive && (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Image source={LIVE_ICON} style={styles.liveIcon} resizeMode="contain" />
            <View style={styles.headerText}>
              <ThemedText style={styles.title}>Live now</ThemedText>
              <ThemedText style={styles.subtitle}>{activeLive?.title ?? 'Live stream'}</ThemedText>
            </View>
          </View>

          <Pressable
            onPress={() => openExternal(liveUrl)}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Watch live">
            <MaterialCommunityIcons name="youtube" size={20} color={colors.textInverse} />
            <ThemedText style={styles.primaryButtonText}>Watch Live</ThemedText>
          </Pressable>
        </View>
      )}

      {/* Next live class — 6 rows for mobile */}
      {!!nextMeeting && (
        <View style={styles.card}>
          {/* Row 1: logo | title + subtitle (Starting soon!) */}
          <View style={styles.row1}>
            <View style={styles.logoColumn}>
              <View style={styles.liveBadgeCircle}>
                <Image source={LIVE_ICON} style={styles.badgeIcon} resizeMode="contain" />
              </View>
            </View>
            <View style={styles.titleColumn}>
              <ThemedText style={styles.nextLiveTitle}>Next Live Class</ThemedText>
              <ThemedText style={styles.startingSubtitle}>Starting soon!</ThemedText>
            </View>
          </View>

          {/* Row 2: with {teacher} */}
          <ThemedText style={styles.withTeacher}>
            with {nextMeeting?.createdBy?.name ?? 'Teacher'}
          </ThemedText>

          {/* Row 3: pic (thumbnail + time pill) */}
          <View style={styles.preview}>
            <Image source={LIVE_CLASS_IMAGE} style={styles.previewImg} resizeMode="cover" />
            <View style={styles.previewOverlay} />
            <View style={styles.previewPill}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={colors.secondary} />
              <ThemedText style={styles.previewPillText}>
                {formatMeetingTime(nextMeeting?.startTime)}
              </ThemedText>
            </View>
          </View>

          {/* Row 4: Today (calendar + date) */}
          <View style={styles.row4}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={colors.orange} />
            <ThemedText style={styles.dateText}>{formatMeetingDate(nextMeeting?.startTime)}</ThemedText>
          </View>

          {/* Row 5: class title */}
          <ThemedText style={styles.meetingTitle}>{nextMeeting?.title ?? 'Live Class'}</ThemedText>

          {/* Row 6: Join Class button */}
          <Pressable
            onPress={() =>
              openExternal(homeService.getGuestModeMeetLink(nextMeeting?.meetLink) ?? nextMeeting?.meetLink)
            }
            style={({ pressed }) => [styles.joinButton, pressed && styles.primaryButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Join class">
            <MaterialCommunityIcons name="video-outline" size={22} color={colors.textInverse} />
            <ThemedText style={styles.primaryButtonText}>Join Class</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: spacing[4],
    gap: spacing[4],
  },
  card: {
    backgroundColor: colors.textInverse,
    padding: spacing[6],
    borderWidth: 4,
    borderColor: colors.secondary,
    borderRadius: radii.none,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  liveIcon: {
    width: 48,
    height: 48,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.xl,
    color: colors.secondary,
  },
  subtitle: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.base,
    color: colors.orange,
    marginTop: spacing[1],
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.secondary,
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[6],
    borderRadius: radii.none,
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 1.01 }],
  },
  primaryButtonText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.lg,
    color: colors.textInverse,
  },
  /* Next Live Class — 6 rows */
  row1: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  logoColumn: {
    marginRight: spacing[4],
  },
  liveBadgeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    width: 44,
    height: 44,
  },
  titleColumn: {
    flex: 1,
  },
  nextLiveTitle: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.xl,
    color: colors.secondary,
  },
  startingSubtitle: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.base,
    color: colors.orange,
    marginTop: spacing[1],
  },
  withTeacher: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginBottom: spacing[4],
    opacity: 0.8,
  },
  preview: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
    borderRadius: radii.sm,
    position: 'relative',
    marginBottom: spacing[3],
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
  previewOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  previewPill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  previewPillText: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.sm,
    color: colors.secondary,
  },
  row4: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  dateText: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.sm,
    color: colors.orange,
  },
  meetingTitle: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.xl,
    color: colors.secondary,
    marginBottom: spacing[5],
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.secondary,
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[6],
    borderRadius: radii.sm,
  },
});

