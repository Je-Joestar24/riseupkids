/**
 * Replays Footer
 * Mirrors web ExploreReplaysFooter: star image + Keep Learning message.
 */

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

const FOOTER_STAR = require('@/assets/images/footer_star.png');

export function ReplaysFooter() {
  return (
    <View style={styles.box}>
      <Image
        source={FOOTER_STAR}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel="Stars"
      />
      <ThemedText style={styles.title}>Keep Learning!</ThemedText>
      <ThemedText style={styles.subtitle}>Watch as many times as you want!</ThemedText>
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
    gap: 0,
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
});
