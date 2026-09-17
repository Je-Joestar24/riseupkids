import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { usePreventScreenCapture } from 'expo-screen-capture';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useAuth } from '@/hooks/authHook';

const DIGIT_COUNT = 6;

/**
 * Chunk 10 Phase C: TOTP / recovery-code login completion for parent and teacher accounts (the
 * only roles reachable on mobile — 2FA is optional here, never mandatory, since only the website
 * admin dashboard requires it). Reached from the login screen when the password check returns
 * `requiresTwoFactor`. Mirrors frontend/src/pages/auth/LoginTwoFactor.jsx's UX.
 */
export default function LoginTwoFactorScreen() {
  const router = useRouter();
  // Chunk 11 — Mobile App Security: blocks screenshots/screen recording on the code-entry screen.
  usePreventScreenCapture('login-two-factor');
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = emailParam ?? '';
  const { verifyLoginTwoFactor } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (!email) {
      router.replace('/');
    }
  }, [email, router]);

  const setDigit = (index: number, value: string) => {
    const v = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    if (error) setError('');
    if (v && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const totpCode = digits.join('');
  const code = useRecoveryCode ? recoveryCode.trim() : totpCode;
  const canSubmit = useRecoveryCode ? recoveryCode.trim().length >= 9 : totpCode.length === DIGIT_COUNT;

  const handleVerify = async () => {
    if (!canSubmit || loading || !email) return;
    setLoading(true);
    setError('');
    try {
      await verifyLoginTwoFactor(email, code);
      // Auth state is set globally; the login screen's own redirect effect (role-based) takes it
      // from here, same as a normal one-step login.
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code');
      setDigits(Array(DIGIT_COUNT).fill(''));
      setRecoveryCode('');
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const toggleRecoveryCode = () => {
    setUseRecoveryCode((prev) => !prev);
    setError('');
    setDigits(Array(DIGIT_COUNT).fill(''));
    setRecoveryCode('');
  };

  if (!email) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <ThemedText type="title" style={styles.title}>
              Enter code
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {useRecoveryCode
                ? 'Enter one of your recovery codes.'
                : 'Enter the 6-digit code from your authenticator app.'}
            </ThemedText>

            {useRecoveryCode ? (
              <TextInput
                style={[styles.recoveryInput, error && styles.inputError]}
                placeholder="ABCDE-12345"
                placeholderTextColor={colors.textMuted}
                value={recoveryCode}
                onChangeText={(t) => {
                  setRecoveryCode(t);
                  if (error) setError('');
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
                accessibilityLabel="Recovery code"
              />
            ) : (
              <View style={styles.digitsRow} accessibilityRole="none" accessibilityLabel="Six digit verification code">
                {digits.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    style={[styles.digitBox, d && styles.digitBoxFilled, error && styles.inputError]}
                    value={d}
                    onChangeText={(t) => setDigit(i, t)}
                    onKeyPress={(e) => handleKeyPress(i, e.nativeEvent.key)}
                    maxLength={1}
                    keyboardType="number-pad"
                    editable={!loading}
                    accessibilityLabel={`Digit ${i + 1} of 6`}
                  />
                ))}
              </View>
            )}

            {error ? (
              <ThemedText style={styles.errorText} accessibilityRole="alert">
                {error}
              </ThemedText>
            ) : null}

            <Pressable
              onPress={handleVerify}
              disabled={!canSubmit || loading}
              style={({ pressed }) => [
                styles.verifyButton,
                pressed && styles.verifyButtonPressed,
                (!canSubmit || loading) && styles.verifyButtonDisabled,
              ]}
              accessibilityLabel="Verify code and continue">
              {loading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <ThemedText style={styles.verifyText}>Verify and continue</ThemedText>
              )}
            </Pressable>

            <Pressable
              onPress={toggleRecoveryCode}
              style={styles.linkButton}
              accessibilityLabel={useRecoveryCode ? 'Use my authenticator app instead' : 'Use a recovery code instead'}>
              <ThemedText style={styles.linkText}>
                {useRecoveryCode ? 'Use my authenticator app instead' : 'Use a recovery code instead'}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => router.replace('/')}
              style={styles.linkButton}
              accessibilityLabel="Back to login">
              <ThemedText style={styles.backText}>Back to login</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgLogin,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
  },
  card: {
    width: '100%',
    maxWidth: 384,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    color: colors.primary,
    fontSize: typography.sizes['2xl'],
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  digitsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  digitBox: {
    width: 44,
    height: 52,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.text,
    textAlign: 'center',
    backgroundColor: '#ffffff',
  },
  digitBoxFilled: {
    borderColor: colors.primary,
  },
  recoveryInput: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_700Bold',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: spacing[3],
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
    fontFamily: 'Quicksand_600SemiBold',
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  verifyButton: {
    width: '100%',
    backgroundColor: colors.btnTeal,
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  verifyButtonPressed: {
    opacity: 0.9,
  },
  verifyButtonDisabled: {
    opacity: 0.7,
  },
  verifyText: {
    color: colors.textInverse,
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
  },
  linkButton: {
    paddingVertical: spacing[1],
  },
  linkText: {
    color: colors.primary,
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    textAlign: 'center',
  },
  backText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_500Medium',
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
