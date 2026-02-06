/**
 * Confirm Modal
 * Simple two-button confirmation dialog (e.g. "Close? Your recording will be lost!")
 */

import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Yes, Close",
  cancelLabel = "Keep Recording",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.message}>{message}</ThemedText>
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}>
              <ThemedText style={styles.cancelBtnText}>{cancelLabel}</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.confirmBtn]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}>
              <ThemedText style={styles.confirmBtnText}>{confirmLabel}</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    padding: spacing[6],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  message: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_400Regular',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[6],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[4],
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btn: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radii.lg,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 2,
    borderColor: colors.orange,
  },
  cancelBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.orange,
  },
  confirmBtn: {
    backgroundColor: colors.secondary,
  },
  confirmBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textInverse,
  },
});
