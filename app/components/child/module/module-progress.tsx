/**
 * Module progress – course title, description, progress bar, summary cards (Completed / To Do / Locked).
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

export interface ModuleProgressProps {
  courseTitle: string;
  courseDescription?: string;
  completedCount: number;
  todoCount: number;
  lockedCount: number;
  totalCount: number;
}

export function ModuleProgress({
  courseTitle,
  courseDescription,
  completedCount,
  todoCount,
  lockedCount,
  totalCount,
}: ModuleProgressProps) {
  const progressPercentage =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>
        {courseTitle || 'Course Title'}
      </ThemedText>
      <ThemedText style={styles.description}>
        {courseDescription || 'Course description'}
      </ThemedText>

      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <ThemedText style={styles.progressLabel}>Your Progress</ThemedText>
          <ThemedText style={styles.progressCount}>
            {completedCount} of {totalCount} complete
          </ThemedText>
        </View>
        <View style={styles.barBg}>
          <View
            style={[styles.barFill, { width: `${progressPercentage}%` }]}
          />
        </View>
      </View>

      <View style={styles.cardsRow}>
        <View style={styles.card}>
          <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}>
            <ThemedText style={styles.cardIconText}>✓</ThemedText>
          </View>
          <ThemedText style={styles.cardCount}>{completedCount}</ThemedText>
          <ThemedText style={styles.cardLabel}>Completed</ThemedText>
        </View>
        <View style={styles.card}>
          <View style={[styles.cardIcon, { backgroundColor: colors.accent }]}>
            <ThemedText style={styles.cardIconText}>★</ThemedText>
          </View>
          <ThemedText style={styles.cardCount}>{todoCount}</ThemedText>
          <ThemedText style={styles.cardLabel}>To Do</ThemedText>
        </View>
        <View style={styles.card}>
          <View style={[styles.cardIcon, { backgroundColor: colors.orange }]}>
            <ThemedText style={styles.cardIconText}>🔒</ThemedText>
          </View>
          <ThemedText style={styles.cardCount}>{lockedCount}</ThemedText>
          <ThemedText style={styles.cardLabel}>Locked</ThemedText>
        </View>
      </View>
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
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: 'rgb(51, 51, 51)',
    marginBottom: spacing[3],
    lineHeight: 36
  },
  description: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgb(51, 51, 51)',
    marginBottom: spacing[6],
  },
  progressSection: {
    marginBottom: spacing[6],
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgb(51, 51, 51)',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgb(51, 51, 51)',
  },
  barBg: {
    height: 16,
    borderRadius: 9999,
    overflow: 'hidden',
    backgroundColor: 'rgb(212, 230, 227)',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 9999,
  },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    marginTop: spacing[6],
  },
  card: {
    flex: 1,
    minWidth: 50,
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: 16,
    backgroundColor: 'rgb(244, 237, 216)',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  cardIconText: {
    fontSize: 20,
    color: colors.textInverse,
    fontWeight: '600',
  },
  cardCount: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[1],
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgb(153, 153, 153)',
  },
});
