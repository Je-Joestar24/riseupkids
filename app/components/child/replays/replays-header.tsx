/**
 * Replays Header (Explore → Replays)
 * Mirrors web ExploreReplaysHeader: Back to Explore + title + description.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export interface ReplaysHeaderProps {
  childId: string;
}

export function ReplaysHeader({ childId }: ReplaysHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => router.push(`/child/${childId}/explore` as never)}
        accessibilityRole="button"
        accessibilityLabel="Back to Explore"
        hitSlop={10}
        style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}>
        <MaterialCommunityIcons name="arrow-left" size={22} color={colors.secondary} />
        <ThemedText style={styles.backText}>Back to Explore</ThemedText>
      </Pressable>

      <View style={styles.titleRow}>
        <ThemedText style={styles.title}>▶ Watch Replays</ThemedText>
      </View>

      <ThemedText style={styles.subtitle}>Watch fun lessons anytime you want!</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    padding: spacing[6],
    marginTop: spacing[4],
    backgroundColor: colors.bgCard,
    borderWidth: 4,
    borderColor: colors.orange,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    gap: spacing[4],
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.secondary,
  },
  titleRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.secondary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
  },
});
