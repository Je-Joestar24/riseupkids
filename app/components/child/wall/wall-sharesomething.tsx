/**
 * Kids Wall Share Something (App)
 * CTA card: "Share Your Amazing Work!" with button; triggers onSharePress (e.g. navigate to share or open modal).
 * Matches web KidsWallShareSomething; mobile-optimized.
 */

import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  KIDS_WALL_UPLOAD_DISABLED_BUTTON,
  KIDS_WALL_UPLOAD_DISABLED_SUBTITLE,
} from '@/constants/kidsWallConsent';

export interface WallShareSomethingProps {
  onSharePress: () => void;
  loading?: boolean;
  /** When false, child can see the card but cannot start a share flow. */
  uploadEnabled?: boolean;
}

export function WallShareSomething({
  onSharePress,
  loading = false,
  uploadEnabled = true,
}: WallShareSomethingProps) {
  const subtitle = uploadEnabled
    ? 'Ask a grown-up to help you share!'
    : KIDS_WALL_UPLOAD_DISABLED_SUBTITLE;

  return (
    <View style={styles.wrapper}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          {uploadEnabled ? (
            <MaterialCommunityIcons name="star-four-points-outline" size={48} color={colors.accent} />
          ) : (
            <MaterialCommunityIcons name="lock" size={48} color={colors.textSecondary} />
          )}
        </View>
        <View style={styles.textWrap}>
          <ThemedText style={styles.title}>Share Your Amazing Work!</ThemedText>
          <ThemedText style={[styles.subtitle, !uploadEnabled && styles.subtitleDisabled]}>
            {subtitle}
          </ThemedText>
        </View>
      </View>
      <Pressable
        onPress={uploadEnabled ? onSharePress : undefined}
        disabled={loading || !uploadEnabled}
        style={({ pressed }) => [
          styles.btn,
          !uploadEnabled && styles.btnDisabledLocked,
          pressed && uploadEnabled && styles.btnPressed,
          loading && styles.btnDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={
          uploadEnabled ? 'Share something cool' : KIDS_WALL_UPLOAD_DISABLED_BUTTON
        }
        accessibilityState={{ disabled: loading || !uploadEnabled }}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <ThemedText style={[styles.btnText, !uploadEnabled && styles.btnTextDisabled]}>
            {uploadEnabled ? 'Share Something Cool!' : KIDS_WALL_UPLOAD_DISABLED_BUTTON}
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bgCard,
    padding: spacing[6],
    borderWidth: 4,
    borderColor: colors.secondary,
    borderRadius: 0,
    marginBottom: spacing[8],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  iconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes['2xl'],
    color: colors.secondary,
    marginBottom: spacing[1],
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.tight,
  },
  subtitle: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    lineHeight: typography.sizes.lg * typography.lineHeights.normal,
  },
  btn: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: 0,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  btnPressed: {
    opacity: 0.9,
  },
  btnDisabled: {
    backgroundColor: colors.bgTertiary,
  },
  btnDisabledLocked: {
    backgroundColor: colors.bgTertiary,
    borderWidth: 2,
    borderColor: colors.border,
  },
  btnTextDisabled: {
    color: colors.textSecondary,
  },
  subtitleDisabled: {
    color: colors.textSecondary,
  },
  btnText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.lg,
    color: colors.textInverse,
  },
});
