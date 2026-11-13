/**
 * Explore Experience Button
 * The wide "Experience" button at the top of the Explore screen. It only opens the list of experiences,
 * so it needs nothing loaded: it is there the moment the screen is.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export interface ExploreExperienceButtonProps {
  onPress: () => void;
}

export function ExploreExperienceButton({ onPress }: ExploreExperienceButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Experience"
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <MaterialCommunityIcons name="star-four-points" size={28} color={colors.textInverse} />
      <ThemedText style={styles.label}>Experience</ThemedText>
      <MaterialCommunityIcons name="arrow-right" size={28} color={colors.textInverse} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 72,
    marginTop: spacing[6],
    paddingHorizontal: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    backgroundColor: colors.orange,
    borderWidth: 4,
    borderColor: colors.orange,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  pressed: {
    opacity: 0.9,
  },
  label: {
    fontSize: typography.sizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
    textAlign: 'center',
  },
});
