import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export interface StarCamFooterProps {
  message?: string;
}

export const StarCamFooter = memo(function StarCamFooter({
  message = 'Tap a bubble to begin!',
}: StarCamFooterProps) {
  return (
    <View style={styles.footer}>
      <ThemedText style={styles.footerText}>{message}</ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  footer: {
    minHeight: 64,
    backgroundColor: colors.accent,
    borderTopWidth: 4,
    borderTopColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
  },
  footerText: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
});
