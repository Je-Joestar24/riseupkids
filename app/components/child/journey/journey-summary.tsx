/**
 * Progress summary for My Journey page.
 * Shows completed, current, and locked course counts with icons.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

export interface JourneySummaryProps {
  completed?: number;
  current?: number;
  locked?: number;
}

const ICON_SIZE = 24;
const ICON_WRAP = 48;

export function JourneySummary({
  completed = 0,
  current = 0,
  locked = 0,
}: JourneySummaryProps) {
  const items: Array<{
    label: string;
    count: number;
    iconBg: string;
    iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  }> = [
    {
      label: 'Completed',
      count: completed,
      iconBg: colors.secondary,
      iconName: 'check-circle',
    },
    {
      label: 'Current',
      count: current,
      iconBg: colors.accent,
      iconName: 'star',
    },
    {
      label: 'Locked',
      count: locked,
      iconBg: colors.primary,
      iconName: 'lock',
    },
  ];

  return (
    <View style={styles.container} accessibilityLabel="Progress Summary">
      <ThemedText style={styles.title}>Progress Summary</ThemedText>
      <View style={styles.grid}>
        {items.map((item) => (
          <View
            key={item.label}
            style={styles.item}
            accessibilityLabel={`${item.label}: ${item.count}`}
            accessibilityRole="text">
            <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
              <MaterialCommunityIcons
                name={item.iconName}
                size={ICON_SIZE}
                color={colors.textInverse}
              />
            </View>
            <ThemedText style={styles.count}>{item.count}</ThemedText>
            <ThemedText style={styles.label}>{item.label}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 848,
    alignSelf: 'center',
    padding: spacing[6],
    marginTop: spacing[12],
    backgroundColor: colors.bgLogin,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.orange,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing[4],
    paddingHorizontal: spacing[2],
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: ICON_WRAP,
    height: ICON_WRAP,
    borderRadius: ICON_WRAP / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  count: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[1],
  },
  label: {
    fontSize: 14,
    color: colors.text,
  },
});
