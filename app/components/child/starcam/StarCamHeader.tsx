import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export const StarCamHeader = memo(function StarCamHeader() {
  return (
    <View
      style={styles.header}
      accessibilityRole="header"
      accessibilityLabel="Star Cam, let's explore">
      <MaterialCommunityIcons name="map-marker-radius" size={30} color={colors.textInverse} />
      <ThemedText style={styles.headerTitle}>LET&apos;S EXPLORE</ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    height: 80,
    backgroundColor: colors.accent,
    borderBottomWidth: 4,
    borderBottomColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  headerTitle: {
    color: colors.textInverse,
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
