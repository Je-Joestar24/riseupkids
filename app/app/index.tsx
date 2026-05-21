import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { ThemedView } from '@/components/themed-view';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useAuth } from '@/hooks/authHook';

export default function LoginScreen() {
  const router = useRouter();
  const { login, user, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  // Redirect parent to select-child screen after successful login
  useEffect(() => {
    if (isAuthenticated && user?.role === 'parent') {
      router.replace('/parent/selectchild');
    }
  }, [isAuthenticated, user?.role, router]);

  const validate = () => {
    const next: { email?: string; password?: string } = {};
    if (!email) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Email is invalid';
    if (!password) next.password = 'Password is required';
    else if (password.length < 6) next.password = 'Password must be at least 6 characters';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      // Error shown via global dialog
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/big-logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Rise Up Kids Logo"
            />
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.formHeader}>
              <ThemedText type="title" style={styles.formTitle}>
                Login now
              </ThemedText>
              <MaterialIcons name="lock" size={22} color={colors.accent} />
            </View>

            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Sign in to access your learning journey
            </ThemedText>

            {/* Email */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              {errors.email && (
                <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
              )}
            </View>

            {/* Password */}
            <View style={styles.field}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.password && styles.inputError,
                  ]}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={12}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={22}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
              {errors.password && (
                <ThemedText style={styles.errorText}>{errors.password}</ThemedText>
              )}
            </View>

            {/* Sign In */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.signInButton,
                pressed && styles.signInButtonPressed,
                loading && styles.signInButtonDisabled,
              ]}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <ThemedText style={styles.signInText}>Sign In</ThemedText>
              )}
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
  logoContainer: {
    marginBottom: spacing[6],
  },
  logo: {
    width: 180,
    height: 180,
  },
  card: {
    width: '100%',
    maxWidth: 384,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  formTitle: {
    color: colors.primary,
    fontSize: typography.sizes['2xl'],
  },
  subtitle: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    marginBottom: spacing[5],
  },
  field: {
    marginBottom: spacing[5],
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_700Bold',
    marginBottom: spacing[2],
    color: colors.text,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.text,
  },
  inputError: {
    borderColor: colors.error,
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing[3],
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    fontFamily: 'Quicksand_500Medium',
    marginTop: spacing[1],
  },
  signInButton: {
    backgroundColor: colors.btnTeal,
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: spacing[2],
    marginBottom: spacing[4],
  },
  signInButtonPressed: {
    opacity: 0.9,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInText: {
    color: colors.textInverse,
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
  },
});
