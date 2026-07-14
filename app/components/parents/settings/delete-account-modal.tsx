import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

const CONFIRM_TEXT = 'DELETE';

interface DeleteAccountModalProps {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (payload: { password: string; confirmText: string }) => Promise<void>;
}

export function DeleteAccountModal({
  visible,
  loading = false,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const reset = () => {
    setPassword('');
    setConfirmText('');
    setError('');
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    if (confirmText.trim().toUpperCase() !== CONFIRM_TEXT) {
      setError(`Please type ${CONFIRM_TEXT} to confirm.`);
      return;
    }
    setError('');
    try {
      await onConfirm({ password, confirmText });
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityRole="alert" accessibilityLabel="Delete account confirmation">
          <ThemedText style={styles.title}>Delete my account</ThemedText>
          <ThemedText style={styles.body}>
            Your login will be revoked immediately. Personal data is permanently deleted within 30
            days. Billing records required by law may be retained separately.
          </ThemedText>

          {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

          <TextInput
            style={styles.input}
            secureTextEntry
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            accessibilityLabel="Password"
          />
          <TextInput
            style={styles.input}
            placeholder={`Type ${CONFIRM_TEXT} to confirm`}
            value={confirmText}
            onChangeText={setConfirmText}
            editable={!loading}
            accessibilityLabel={`Type ${CONFIRM_TEXT} to confirm account deletion`}
          />

          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              disabled={loading}
              style={({ pressed }) => [styles.buttonSecondary, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Cancel account deletion">
              <ThemedText style={styles.buttonSecondaryText}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [styles.buttonDanger, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Confirm delete my account">
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonDangerText}>Delete my account</ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing[6],
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    padding: spacing[6],
    gap: spacing[3],
  },
  title: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.xl,
    color: colors.error,
  },
  body: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  error: {
    color: colors.error,
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.base,
    backgroundColor: colors.bgSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.text,
  },
  buttonDanger: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  buttonDangerText: {
    fontFamily: 'Quicksand_700Bold',
    color: '#fff',
  },
  pressed: {
    opacity: 0.85,
  },
});
