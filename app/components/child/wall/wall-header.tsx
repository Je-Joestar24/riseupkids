/**
 * Kids Wall Header (App)
 * "Show & Tell!" with stars; subtitle: "See what friends are learning!"
 * Matches web KidsWallHeader; mobile-optimized.
 */

import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function WallHeader() {
  return (
    <View style={styles.wrapper} accessibilityRole="header">
      <View style={styles.titleRow}>
        <ThemedText style={styles.title}>Show & Tell!</ThemedText>
        <MaterialCommunityIcons name="star" size={32} color={colors.accent} />
      </View>
      <ThemedText style={styles.subtitle}>
        See what friends are learning!
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    padding: spacing[6],
    borderWidth: 4,
    borderColor: colors.orange,
    marginBottom: spacing[8],
    backgroundColor: colors.bgCard,
    borderRadius: 0,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  title: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes['3xl'],
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: typography.sizes['3xl'] * typography.lineHeights.tight,
  },
  subtitle: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.xl,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.xl * typography.lineHeights.tight,
  },
});
