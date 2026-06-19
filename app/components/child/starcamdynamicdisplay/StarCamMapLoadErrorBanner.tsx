import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Quicksand } from '@/constants/theme';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export interface StarCamMapLoadErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export const StarCamMapLoadErrorBanner = memo(function StarCamMapLoadErrorBanner({
  message,
  onDismiss,
}: StarCamMapLoadErrorBannerProps) {
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        onPress={onDismiss}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`Mission could not load. ${message}. Tap to dismiss.`}>
        <ThemedText style={styles.text}>{message}</ThemedText>
        <ThemedText style={styles.hint}>Tap to try again later</ThemedText>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[6],
    zIndex: 60,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.orange,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  text: {
    fontSize: typography.sizes.sm,
    fontFamily: Quicksand.bold,
    textAlign: 'center',
    color: '#c0392b',
    marginBottom: spacing[1],
  },
  hint: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    color: colors.textSecondary,
  },
});
