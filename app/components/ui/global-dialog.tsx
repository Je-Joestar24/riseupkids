/**
 * Rise Up Kids Global Dialog
 * Child-friendly styling - large icons, big fonts, centered, rounded
 * Based on web ChildDialogBox
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useUiStore } from '@/store/uiStore';

import type { DialogType } from '@/store/uiStore';

const TYPE_CONFIG: Record<
  DialogType,
  { icon: keyof typeof MaterialIcons.glyphMap; color: string }
> = {
  success: { icon: 'check-circle', color: colors.success },
  error: { icon: 'error', color: colors.error },
  warning: { icon: 'warning', color: colors.warning },
  info: { icon: 'info', color: colors.primary },
};

export function GlobalDialog() {
  const { dialog, hideDialog } = useUiStore();

  useEffect(() => {
    if (dialog.open && dialog.duration > 0 && dialog.type !== 'error') {
      const t = setTimeout(hideDialog, dialog.duration);
      return () => clearTimeout(t);
    }
  }, [dialog.open, dialog.duration, dialog.type, hideDialog]);

  if (!dialog.open) return null;

  const config = TYPE_CONFIG[dialog.type] ?? TYPE_CONFIG.info;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={hideDialog}
      statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={hideDialog}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Pressable
            onPress={hideDialog}
            hitSlop={16}
            style={styles.closeBtn}
            accessibilityLabel="Close">
            <MaterialIcons name="close" size={26} color={colors.textSecondary} />
          </Pressable>

          <View style={styles.content}>
            <MaterialIcons
              name={config.icon}
              size={48}
              color={config.color}
              style={styles.icon}
            />
            <ThemedText
              style={[
                styles.message,
                dialog.type === 'success' && styles.messageSuccess,
                dialog.type === 'success' && { color: colors.success },
              ]}>
              {dialog.message}
            </ThemedText>
            {dialog.type === 'success' && (
              <ThemedText style={styles.subtitle}>
                Everyone can see your amazing work now!
              </ThemedText>
            )}
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
    paddingTop: spacing[8],
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing[2],
    top: spacing[2],
    padding: spacing[2],
  },
  content: {
    alignItems: 'center',
    paddingTop: spacing[4],
  },
  icon: {
    marginBottom: spacing[4],
  },
  message: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_600SemiBold',
    textAlign: 'center',
    lineHeight: 28,
    color: colors.text,
  },
  messageSuccess: {
    fontSize: typography.sizes['2xl'] + 2,
  },
  subtitle: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_400Regular',
    color: colors.textSecondary,
    marginTop: spacing[2],
    textAlign: 'center',
  },
});
