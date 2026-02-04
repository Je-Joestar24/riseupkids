/**
 * Journey header for My Journey page.
 * Displays title and step progress (Step X of Y).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

export interface JourneyHeaderProps {
  /** Current step (e.g. completed + 1 when in progress) */
  week?: number;
  /** Total steps (e.g. total courses) */
  totalWeeks?: number;
}

export function JourneyHeader({ week = 1, totalWeeks = 1 }: JourneyHeaderProps) {
  return (
    <View style={styles.container} accessibilityRole="header">
      <ThemedText style={styles.title}>My Journey</ThemedText>
      <ThemedText style={styles.subtitle}>
        Step {week} of {totalWeeks}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 848,
    marginBottom: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.textInverse,
    marginBottom: spacing[4],
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
