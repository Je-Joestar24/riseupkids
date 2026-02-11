/**
 * Contents Footer (Explore videos by type)
 * Video-type-specific motivational title and subtitle.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import {
  VIDEO_TYPE_FOOTER_SUBTITLES,
  VIDEO_TYPE_FOOTER_TITLES,
} from '@/constants/explore';

export interface ContentsFooterProps {
  videoType: string;
}

export function ContentsFooter({ videoType }: ContentsFooterProps) {
  const title = VIDEO_TYPE_FOOTER_TITLES[videoType] ?? "You're All Amazing!";
  const subtitle = VIDEO_TYPE_FOOTER_SUBTITLES[videoType] ?? 'Keep learning and sharing!';

  return (
    <View style={styles.box}>
      <View style={styles.starsRow}>
        <MaterialCommunityIcons name="star" size={64} color={colors.orange} />
        <MaterialCommunityIcons name="star" size={80} color={colors.accent} />
        <MaterialCommunityIcons name="star" size={64} color={colors.secondary} />
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    padding: spacing[8],
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_600SemiBold',
    opacity: 0.8,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
});
