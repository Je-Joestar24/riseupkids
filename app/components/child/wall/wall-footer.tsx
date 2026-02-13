/**
 * Kids Wall Footer (App)
 * Motivational message: "You're All Amazing!" / "Keep learning and sharing!"
 * Matches web KidsWallFooter; mobile-optimized.
 */

import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function WallFooter() {
  return (
    <View style={styles.wrapper} accessibilityRole="none">
      <View style={styles.starsRow}>
        <MaterialCommunityIcons name="star" size={40} color={colors.orange} />
        <MaterialCommunityIcons name="star" size={56} color={colors.accent} />
        <MaterialCommunityIcons name="star" size={40} color={colors.secondary} />
      </View>
      <ThemedText style={styles.title}>You're All Amazing!</ThemedText>
      <ThemedText style={styles.subtitle}>
        Keep learning and sharing!
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginTop: spacing[8],
    padding: spacing[8],
    backgroundColor: colors.bgCard,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
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
    lineHeight: typography.sizes.xl * typography.lineHeights.normal,
  },
});
