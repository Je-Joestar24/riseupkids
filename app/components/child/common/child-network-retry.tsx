/**
 * Child-friendly network / load retry panel.
 * Matches the HTML5 games "Try Again" pattern: icon, short copy, one retry action.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import {
  NETWORK_UNAVAILABLE_MESSAGE,
  NETWORK_UNAVAILABLE_TITLE,
} from '@/utils/networkError';

export interface ChildNetworkRetryProps {
  onRetry: () => void;
  retrying?: boolean;
  title?: string;
  message?: string;
  retryLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function ChildNetworkRetry({
  onRetry,
  retrying = false,
  title = NETWORK_UNAVAILABLE_TITLE,
  message = NETWORK_UNAVAILABLE_MESSAGE,
  retryLabel = 'Try again',
  secondaryLabel,
  onSecondary,
}: ChildNetworkRetryProps) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${message}`}>
      <View style={styles.card}>
        <MaterialCommunityIcons
          name="wifi-off"
          size={56}
          color={colors.orange}
          accessibilityElementsHidden
        />
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.message}>{message}</ThemedText>
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          style={({ pressed }) => [
            styles.retryBtn,
            pressed && !retrying && styles.retryBtnPressed,
            retrying && styles.retryBtnDisabled,
          ]}>
          {retrying ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <ThemedText style={styles.retryBtnText}>{retryLabel}</ThemedText>
          )}
        </Pressable>
        {secondaryLabel && onSecondary ? (
          <Pressable
            onPress={onSecondary}
            disabled={retrying}
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.85 }]}>
            <ThemedText style={styles.secondaryBtnText}>{secondaryLabel}</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.bgCard,
    borderRadius: radii['2xl'],
    borderWidth: 3,
    borderColor: colors.orange,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[6],
    alignItems: 'center',
    gap: spacing[4],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.secondary,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryBtn: {
    marginTop: spacing[2],
    minWidth: 180,
    minHeight: 48,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.secondary,
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 1.03 }],
  },
  retryBtnDisabled: {
    opacity: 0.7,
  },
  retryBtnText: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
  secondaryBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  secondaryBtnText: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.orange,
  },
});
