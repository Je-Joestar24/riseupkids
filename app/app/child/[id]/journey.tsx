/**
 * Child Journey (placeholder)
 */

import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

export default function ChildJourneyScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] }}>
      <ThemedText style={{ fontSize: 18, color: colors.textInverse }}>My Journey</ThemedText>
      <ThemedText style={{ color: colors.textInverse, marginTop: spacing[2] }}>Coming soon</ThemedText>
    </View>
  );
}
