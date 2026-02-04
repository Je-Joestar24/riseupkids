/**
 * Accumulated Stats (Child Home)
 * Mirrors web: Day Streak, Total Stars, Badges
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

const FIRE_ICON = require('@/assets/images/fire.png');
const STAR_ICON = require('@/assets/images/star.png');

export interface AccumulateStatProps {
  dayStreak: number;
  totalStars: number;
  badges: number;
}

function StatCard({
  icon,
  value,
  label,
  valueColor,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  valueColor: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.iconWrap}>{icon}</View>
      <ThemedText style={[styles.value, { color: valueColor }]}>{value}</ThemedText>
      <ThemedText style={styles.label}>{label}</ThemedText>
    </View>
  );
}

export function AccumulateStat({ dayStreak, totalStars, badges }: AccumulateStatProps) {
  return (
    <View style={styles.grid} accessibilityRole="summary">
      <StatCard
        icon={<Image source={FIRE_ICON} style={styles.iconImg} resizeMode="contain" />}
        value={dayStreak}
        label="Day Streak"
        valueColor={colors.orange}
      />
      <StatCard
        icon={<Image source={STAR_ICON} style={styles.iconImg} resizeMode="contain" />}
        value={totalStars}
        label="Total Stars"
        valueColor={colors.orange}
      />
      <StatCard
        icon={
          <MaterialCommunityIcons name="medal-outline" size={48} color={colors.accent} />
        }
        value={badges}
        label="Badges"
        valueColor={colors.secondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.textInverse,
    padding: spacing[5],
    borderRadius: radii.none,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    marginBottom: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImg: {
    width: 48,
    height: 48,
  },
  value: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes['2xl'],
    marginBottom: spacing[1],
    lineHeight: 32,
  },
  label: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

