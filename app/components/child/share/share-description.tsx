/**
 * Share Something Description (App)
 * "Tell Us About It!" multiline input and character counter.
 * Matches web ShareSomethingDescription.
 */

import { View, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

const BORDER_PEACH = 'rgb(253, 232, 222)';
const BORDER_TEAL = 'rgb(212, 230, 227)';

export interface ShareDescriptionProps {
  description: string;
  onDescriptionChange: (value: string) => void;
  maxLength?: number;
}

export function ShareDescription({
  description,
  onDescriptionChange,
  maxLength = 150,
}: ShareDescriptionProps) {
  const handleChange = (text: string) => {
    if (text.length <= maxLength) onDescriptionChange(text);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.headRow}>
        <ThemedText style={styles.emoji}>💭</ThemedText>
        <ThemedText style={styles.heading}>Tell Us About It!</ThemedText>
      </View>
      <View style={styles.inputWrap}>
        <TextInput
          value={description}
          onChangeText={handleChange}
          placeholder="I made this because..."
          placeholderTextColor={colors.textMuted}
          maxLength={maxLength}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.input}
          accessibilityLabel="Description input"
        />
      </View>
      <ThemedText style={styles.counter}>
        {description.length}/{maxLength} letters
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    padding: spacing[6],
    borderWidth: 4,
    borderColor: BORDER_PEACH,
    borderRadius: 0,
    backgroundColor: colors.bgCard,
    gap: spacing[4],
    marginBottom: spacing[8],
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  emoji: {
    fontSize: 36,
    lineHeight: 36,
  },
  heading: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes['2xl'],
    color: colors.secondary,
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.tight,
  },
  inputWrap: {
    padding: spacing[4],
    borderWidth: 4,
    borderColor: BORDER_TEAL,
    borderRadius: 0,
    minHeight: 112,
  },
  input: {
    padding: 0,
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.xl,
    color: colors.text,
    backgroundColor: 'transparent',
    minHeight: 80,
    maxHeight: 160,
  },
  counter: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
});
