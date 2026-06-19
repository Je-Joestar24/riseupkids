/**
 * Module footer – encouraging message with star icon.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

export function ModuleFooter() {
  return (
    <View style={styles.container}>
      <View style={styles.starCircle}>
        <ThemedText style={styles.starEmoji}>⭐</ThemedText>
      </View>
      <ThemedText style={styles.title}>You're doing great!</ThemedText>
      <ThemedText style={styles.subtitle}>
        Keep going to unlock more fun activities and earn stars!
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: spacing[8],
    backgroundColor: colors.textInverse,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginTop: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  starCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  starEmoji: {
    fontSize: 32,
    lineHeight: 32
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.orange,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
});
