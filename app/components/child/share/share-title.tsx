/**
 * Share Something Title (App)
 * "Give it a Title!" with text input and character counter.
 * Matches web ShareSomethingTitle.
 */

import { View, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

const BORDER_PEACH = 'rgb(253, 232, 222)';
const BORDER_TEAL = 'rgb(212, 230, 227)';

export interface ShareTitleProps {
  title: string;
  onTitleChange: (value: string) => void;
  maxLength?: number;
}

export function ShareTitle({
  title,
  onTitleChange,
  maxLength = 50,
}: ShareTitleProps) {
  const handleChange = (text: string) => {
    if (text.length <= maxLength) onTitleChange(text);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.headRow}>
        <ThemedText style={styles.emoji}>✏️</ThemedText>
        <ThemedText style={styles.heading}>Give it a Title!</ThemedText>
      </View>
      <TextInput
        value={title}
        onChangeText={handleChange}
        placeholder="My Awesome Creation!"
        placeholderTextColor={colors.textMuted}
        maxLength={maxLength}
        style={styles.input}
        accessibilityLabel="Title input"
      />
      <ThemedText style={styles.counter}>
        {title.length}/{maxLength} letters
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
  input: {
    padding: spacing[4],
    borderWidth: 4,
    borderColor: BORDER_TEAL,
    borderRadius: 0,
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.xl,
    color: colors.text,
    backgroundColor: colors.bgCard,
    minHeight: 52,
  },
  counter: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
});
