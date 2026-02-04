/**
 * Start Learning (Child Home)
 * First section: uses sample.png avatar/image as requested
 */

import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

const SAMPLE_AVATAR = require('@/assets/images/sample.png');

export interface StartLearningProps {
  displayName?: string | null;
  onStartLearning: () => void;
}

export function StartLearning({ displayName, onStartLearning }: StartLearningProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Image
            source={SAMPLE_AVATAR}
            style={styles.avatarImage}
            resizeMode="cover"
            accessibilityLabel="Child avatar"
          />
        </View>

        <View style={styles.textWrap}>
          <ThemedText style={styles.greeting}>Hi, {displayName ?? 'Friend'}!</ThemedText>
          <ThemedText style={styles.subgreeting}>Ready to learn something awesome?</ThemedText>
        </View>
      </View>

      <Pressable
        onPress={onStartLearning}
        style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Start learning">
        <MaterialIcons name="play-arrow" size={36} color={colors.textInverse} />
        <ThemedText style={styles.startButtonText}>Start Learning!</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.textInverse,
    padding: spacing[8],
    borderWidth: 4,
    borderColor: colors.orange,
    borderRadius: radii.none,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  textWrap: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.sizes['3xl'],
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.secondary,
    marginBottom: spacing[1],
  },
  subgreeting: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    backgroundColor: colors.accent,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[8],
    borderRadius: radii.none,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startButtonPressed: {
    opacity: 0.95,
  },
  startButtonText: {
    fontSize: typography.sizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
});

