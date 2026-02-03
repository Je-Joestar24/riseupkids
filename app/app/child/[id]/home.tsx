/**
 * Child Home (placeholder)
 * Selected child's home - full implementation TBD
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

export default function ChildHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] }}>
      <ThemedText style={{ fontSize: 18, marginBottom: spacing[4] }}>
        Child Home – {id ?? 'Unknown'}
      </ThemedText>
      <ThemedText style={{ color: colors.textSecondary, textAlign: 'center', marginBottom: spacing[6] }}>
        Coming soon
      </ThemedText>
      <Pressable
        onPress={() => router.back()}
        style={{ padding: spacing[4], backgroundColor: colors.primary, borderRadius: 8 }}>
        <ThemedText style={{ color: colors.textInverse, fontFamily: 'Quicksand_600SemiBold' }}>
          Back to Select Child
        </ThemedText>
      </Pressable>
    </View>
  );
}
