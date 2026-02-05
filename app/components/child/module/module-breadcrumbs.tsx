/**
 * Module breadcrumbs – "My Journey" button + Step N.
 * Tapping "My Journey" goes back to journey list; active nav stays My Journey.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

export interface ModuleBreadcrumbsProps {
  stepNumber: number;
  childId: string;
}

export function ModuleBreadcrumbs({ stepNumber, childId }: ModuleBreadcrumbsProps) {
  const router = useRouter();

  const onJourneyClick = () => {
    router.push(`/child/${childId}/journey` as never);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={onJourneyClick}
        style={({ pressed }) => [styles.journeyButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="My Journey">
        <ThemedText style={styles.journeyEmoji}>🗺️</ThemedText>
        <ThemedText style={styles.journeyLabel}>My Journey</ThemedText>
      </Pressable>
      <View style={styles.chevron} aria-hidden>
        <ThemedText style={styles.chevronText}>›</ThemedText>
      </View>
      <View style={styles.stepBadge}>
        <ThemedText style={styles.stepEmoji}>📚</ThemedText>
        <ThemedText style={styles.stepLabel}>Step {stepNumber}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[6],
    flexWrap: 'wrap',
    width: '100%',
  },
  journeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: {
    opacity: 0.9,
  },
  journeyEmoji: {
    fontSize: 20,
  },
  journeyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  chevron: {
    marginHorizontal: 4,
  },
  chevronText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    backgroundColor: colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepEmoji: {
    fontSize: 20,
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textInverse,
  },
});
