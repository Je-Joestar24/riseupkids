import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Quicksand } from '@/constants/theme';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export interface StarCamMapEmptyMissionsProps {
  borderColor: string;
}

export const StarCamMapEmptyMissions = memo(function StarCamMapEmptyMissions({
  borderColor,
}: StarCamMapEmptyMissionsProps) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="text"
      accessibilityLabel="No available missions in this category">
      <View style={[styles.card, { borderColor }]}>
        <ThemedText style={styles.title}>No available missions in this category</ThemedText>
        <ThemedText style={styles.subtitle}>Check back soon for new adventures!</ThemedText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  card: {
    maxWidth: 320,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 20,
    borderWidth: 2,
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontFamily: Quicksand.bold,
    textAlign: 'center',
    color: '#334155',
    marginBottom: spacing[2],
    lineHeight: Math.round(typography.sizes.lg * 1.35),
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    color: '#64748b',
    lineHeight: Math.round(typography.sizes.sm * 1.4),
  },
});
