/**
 * Share Something CTA (App)
 * "Ready to Share?" with submit button; disabled until photo + title + description filled.
 * Matches web ShareSomethingCta.
 */

import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface ShareCtaSubmitPayload {
  photo: { uri: string };
  title: string;
  description: string;
}

export interface ShareCtaProps {
  photo: { uri: string } | null;
  title: string;
  description: string;
  onSubmit: (payload: ShareCtaSubmitPayload) => void | Promise<void>;
  loading?: boolean;
}

export function ShareCta({
  photo,
  title,
  description,
  onSubmit,
  loading = false,
}: ShareCtaProps) {
  const hasPhoto = Boolean(photo?.uri);
  const hasTitle = Boolean(title?.trim().length);
  const hasDescription = Boolean(description?.trim().length);
  const isFormComplete = hasPhoto && hasTitle && hasDescription;
  const isDisabled = !isFormComplete || loading;

  const handleSubmit = () => {
    if (isDisabled || !photo) return;
    onSubmit({
      photo: { uri: photo.uri },
      title: title.trim(),
      description: description.trim(),
    });
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.headRow}>
        <MaterialCommunityIcons name="emoticon-happy-outline" size={40} color={colors.accent} />
        <View style={styles.headText}>
          <ThemedText style={styles.title}>Ready to Share?</ThemedText>
          <ThemedText style={styles.subtitle}>Ask a grown-up to help you!</ThemedText>
        </View>
      </View>
      <Pressable
        onPress={handleSubmit}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.btn,
          isDisabled && styles.btnDisabled,
          !isDisabled && pressed && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={isDisabled ? 'Fill everything out first' : 'Share my work'}
        accessibilityState={{ disabled: isDisabled }}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <>
            {!isDisabled && (
              <MaterialCommunityIcons name="star" size={22} color={colors.textInverse} />
            )}
            <ThemedText style={[styles.btnText, isDisabled && styles.btnTextDisabled]}>
              {isDisabled ? 'Fill Everything Out First!' : 'Share My Work!'}
            </ThemedText>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    padding: spacing[6],
    borderWidth: 4,
    borderColor: colors.accent,
    borderRadius: 0,
    backgroundColor: colors.bgCard,
    marginBottom: spacing[8],
    gap: spacing[4],
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  headText: {
    flex: 1,
    gap: spacing[1],
  },
  title: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes['2xl'],
    color: colors.secondary,
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.tight,
  },
  subtitle: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.lg,
    color: colors.textSecondary,
    lineHeight: typography.sizes.lg * typography.lineHeights.tight,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: 0,
    backgroundColor: colors.orange,
    minHeight: 52,
  },
  btnDisabled: {
    backgroundColor: colors.bgTertiary,
  },
  btnPressed: {
    opacity: 0.9,
  },
  btnText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.lg,
    color: colors.textInverse,
  },
  btnTextDisabled: {
    color: colors.textMuted,
  },
});
