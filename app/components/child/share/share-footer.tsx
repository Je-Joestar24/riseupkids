/**
 * Share Something Footer (App)
 * Motivational message: "You're Doing Great!" / "We can't wait to see your work!"
 * Matches web ShareSomethingFooter.
 */

import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function ShareFooter() {
  return (
    <View style={styles.wrapper}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name="star" size={64} color={colors.accent} />
      </View>
      <ThemedText style={styles.title}>You're Doing Great!</ThemedText>
      <ThemedText style={styles.subtitle}>
        We can't wait to see your work!
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    padding: spacing[6],
    borderRadius: 0,
    backgroundColor: colors.bgCard,
    marginBottom: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
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
