/**
 * Contents Empty (Explore videos by type)
 * Shown when there are no videos for this type yet.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export function ContentsEmpty() {
  return (
    <View style={styles.box}>
      <ThemedText style={styles.emoji}>📹</ThemedText>
      <ThemedText style={styles.title}>No Videos Available Yet</ThemedText>
      <ThemedText style={styles.subtitle}>Check back soon for new videos!</ThemedText>
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
  emoji: {
    fontSize: 60,
    lineHeight: 60,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 28,
  },
  subtitle: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
});
