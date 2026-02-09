/**
 * Explore Something
 * Footer CTA: "What Do You Want to Learn? Pick Something fun!"
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export function ExploreSomething() {
  return (
    <View style={styles.box}>
      <ThemedText style={styles.title}>What Do You Want to Learn?</ThemedText>
      <ThemedText style={styles.subtitle}>Pick Something fun!</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    padding: spacing[8],
    borderWidth: 4,
    borderColor: colors.orange,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  title: {
    fontSize: typography.sizes['3xl'],
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 36,
  },
  subtitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
});
