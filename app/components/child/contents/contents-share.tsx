/**
 * Contents Share (Explore videos by type)
 * Video-type-specific share CTA; navigates to Kid's Wall share.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import {
  VIDEO_TYPE_SHARE_BUTTONS,
  VIDEO_TYPE_SHARE_SUBTITLES,
  VIDEO_TYPE_SHARE_TITLES,
} from '@/constants/explore';
import { KIDS_WALL_UPLOAD_DISABLED_MESSAGE } from '@/constants/kidsWallConsent';
import { useChildProfile } from '@/hooks/childProfileHook';
import { useUiStore } from '@/store/uiStore';
import { isKidsWallComingSoon } from '@/utils/kidsWallComingSoon';

export interface ContentsShareProps {
  childId: string;
  videoType: string;
}

export function ContentsShare({ childId, videoType }: ContentsShareProps) {
  const router = useRouter();
  const comingSoon = isKidsWallComingSoon();
  const { kidsWallEnabled } = useChildProfile(comingSoon ? null : childId);
  const showDialog = useUiStore((s) => s.showDialog);

  const shareTitle = VIDEO_TYPE_SHARE_TITLES[videoType] ?? 'Share My Work!';
  const shareSubtitle = VIDEO_TYPE_SHARE_SUBTITLES[videoType] ?? 'Show everyone what you did!';
  const shareButtonText = VIDEO_TYPE_SHARE_BUTTONS[videoType] ?? 'Share My Work!';

  const handlePress = () => {
    if (!kidsWallEnabled) {
      showDialog({
        message: KIDS_WALL_UPLOAD_DISABLED_MESSAGE,
        type: 'info',
        duration: 5000,
      });
      return;
    }
    router.push(
      `/child/${childId}/wall/share?from=explore&videoType=${encodeURIComponent(videoType)}` as never
    );
  };

  if (comingSoon) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.textCol}>
        <ThemedText style={styles.title}>{shareTitle}</ThemedText>
        <ThemedText style={styles.subtitle}>{shareSubtitle}</ThemedText>
      </View>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={shareButtonText}
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}>
        <ThemedText style={styles.btnText}>{shareButtonText}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: spacing[6],
    backgroundColor: colors.bgCard,
    borderWidth: 4,
    borderColor: colors.accent,
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  textCol: {
    flex: 1,
    gap: spacing[1],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.secondary,
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textMuted,
  },
  btn: {
    backgroundColor: colors.orange,
    paddingVertical: spacing[4],
    width: '80%',
    flexDirection: 'row',
  },
  btnText: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textInverse,
    margin: 'auto'
  },
});
