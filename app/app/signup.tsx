import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

export default function SignupScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <ThemedText type="title">Create Account</ThemedText>
        <ThemedText style={styles.subtitle}>Coming soon</ThemedText>
        <ThemedText type="link" onPress={() => router.back()} style={styles.back}>
          ← Back to Login
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLogin,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: spacing[6],
  },
  subtitle: {
    marginTop: spacing[2],
    color: colors.textSecondary,
  },
  back: {
    marginTop: spacing[6],
  },
});
