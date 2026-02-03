/**
 * Child Add Modal
 * Two-step flow: 1) Password verification, 2) Child form
 * Mobile and tablet responsive
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useAuthStore } from '@/store/useAuthStore';
import { authService } from '@/services/authService';
import { useParentChild } from '@/hooks/parentChildHook';
import { useUI } from '@/hooks/uiHook';

const TABLET_BREAKPOINT = 600;

interface ChildAddModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChildAddModal({ open, onClose }: ChildAddModalProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const maxWidth = isTablet ? 420 : width - spacing[8];

  const user = useAuthStore((s) => s.user);
  const { createChild, isMutating } = useParentChild();
  const { showError, showSuccess } = useUI();

  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [formData, setFormData] = useState({ displayName: '', age: '' });
  const [errors, setErrors] = useState<{ displayName?: string; age?: string }>({});

  const handleClose = () => {
    setStep(1);
    setPassword('');
    setShowPassword(false);
    setPasswordError('');
    setVerifying(false);
    setFormData({ displayName: '', age: '' });
    setErrors({});
    onClose();
  };

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }
    setVerifying(true);
    setPasswordError('');
    try {
      await authService.login(user?.email as string, password);
      setStep(2);
      setPassword('');
    } catch {
      setPasswordError('Incorrect password. Please try again.');
      setPassword('');
    } finally {
      setVerifying(false);
    }
  };

  const validateForm = () => {
    const next: { displayName?: string; age?: string } = {};
    if (!formData.displayName.trim()) {
      next.displayName = 'Display name is required';
    } else if (formData.displayName.trim().length > 50) {
      next.displayName = 'Display name cannot exceed 50 characters';
    }
    if (formData.age) {
      const ageNum = parseInt(formData.age, 10);
      if (isNaN(ageNum) || ageNum < 0 || ageNum > 18) {
        next.age = 'Age must be between 0 and 18';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const child = await createChild({
      displayName: formData.displayName.trim(),
      age: formData.age ? parseInt(formData.age, 10) : undefined,
    });
    if (child) {
      showSuccess('Child profile created!');
      handleClose();
    } else {
      showError('Failed to create child. Please try again.');
    }
  };

  if (!open) return null;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={[styles.card, { maxWidth }]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={styles.title}>
              {step === 1 ? 'Verify Password' : 'Add New Child'}
            </ThemedText>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              accessibilityLabel="Close">
              <MaterialIcons name="close" size={26} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {step === 1 ? (
              <View style={styles.step1}>
                <View style={styles.lockIconWrap}>
                  <MaterialIcons name="lock" size={40} color={colors.primary} />
                </View>
                <ThemedText style={styles.verifyText}>
                  For security, please enter your password to add a new child profile
                </ThemedText>
                <View style={[styles.field, { width: '100%' }]}>
                  <ThemedText style={styles.label}>Password</ThemedText>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        passwordError && styles.inputError,
                      ]}
                      placeholder="Password"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        setPasswordError('');
                      }}
                      secureTextEntry={!showPassword}
                      editable={!verifying}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                      hitSlop={12}>
                      <MaterialIcons
                        name={showPassword ? 'visibility-off' : 'visibility'}
                        size={22}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>
                  {passwordError ? (
                    <ThemedText style={styles.errorText}>{passwordError}</ThemedText>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={styles.step2}>
                <View style={styles.field}>
                  <ThemedText style={styles.label}>Child's Name</ThemedText>
                  <TextInput
                    style={[styles.input, errors.displayName && styles.inputError]}
                    placeholder="Enter child's display name"
                    placeholderTextColor={colors.textMuted}
                    value={formData.displayName}
                    onChangeText={(t) => {
                      setFormData((p) => ({ ...p, displayName: t }));
                      if (errors.displayName) setErrors((e) => ({ ...e, displayName: undefined }));
                    }}
                    editable={!isMutating}
                  />
                  {errors.displayName && (
                    <ThemedText style={styles.errorText}>{errors.displayName}</ThemedText>
                  )}
                </View>
                <View style={styles.field}>
                  <ThemedText style={styles.label}>Age (Optional)</ThemedText>
                  <TextInput
                    style={[styles.input, errors.age && styles.inputError]}
                    placeholder="0–18"
                    placeholderTextColor={colors.textMuted}
                    value={formData.age}
                    onChangeText={(t) => {
                      setFormData((p) => ({ ...p, age: t }));
                      if (errors.age) setErrors((e) => ({ ...e, age: undefined }));
                    }}
                    keyboardType="number-pad"
                    editable={!isMutating}
                  />
                  {errors.age ? (
                    <ThemedText style={styles.errorText}>{errors.age}</ThemedText>
                  ) : (
                    <ThemedText style={styles.hint}>Age between 0 and 18</ThemedText>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            {step === 1 ? (
              <>
                <Pressable
                  onPress={handleClose}
                  disabled={verifying}
                  style={({ pressed }) => [styles.btnOutlined, pressed && styles.btnPressed]}>
                  <ThemedText style={styles.btnOutlinedText}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleVerifyPassword}
                  disabled={verifying || !password.trim()}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    pressed && styles.btnPressed,
                    (!password.trim() || verifying) && styles.btnDisabled,
                  ]}>
                  {verifying ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <ThemedText style={styles.btnPrimaryText}>Verify</ThemedText>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => setStep(1)}
                  disabled={isMutating}
                  style={({ pressed }) => [styles.btnOutlined, pressed && styles.btnPressed]}>
                  <ThemedText style={styles.btnOutlinedText}>Back</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleClose}
                  disabled={isMutating}
                  style={({ pressed }) => [styles.btnOutlined, pressed && styles.btnPressed]}>
                  <ThemedText style={styles.btnOutlinedText}>Cancel</ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={isMutating}
                  style={({ pressed }) => [
                    styles.btnPrimary,
                    pressed && styles.btnPressed,
                    isMutating && styles.btnDisabled,
                  ]}>
                  {isMutating ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <ThemedText style={styles.btnPrimaryText}>Add Child</ThemedText>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: spacing[8],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  title: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.xl,
    color: colors.text,
  },
  scrollContent: {
    padding: spacing[6],
    paddingTop: spacing[5],
  },
  step1: {
    alignItems: 'center',
    gap: spacing[4],
  },
  lockIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyText: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.base,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  step2: {
    gap: spacing[4],
  },
  field: {
    marginBottom: spacing[4],
  },
  label: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.sm,
    color: colors.text,
    marginBottom: spacing[2],
  },
  input: {
    backgroundColor: '#fff',
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
  eyeBtn: {
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
  hint: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    fontFamily: 'Quicksand_400Regular',
    marginTop: spacing[1],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  btnOutlined: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[6],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrimary: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[6],
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    minWidth: 100,
    alignItems: 'center',
  },
  btnPressed: {
    opacity: 0.9,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnOutlinedText: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  btnPrimaryText: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.sm,
    color: colors.textInverse,
  },
});
