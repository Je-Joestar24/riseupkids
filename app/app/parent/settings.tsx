import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { DeleteAccountModal } from '@/components/parents/settings/delete-account-modal';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useAuth } from '@/hooks/authHook';
import { useUI } from '@/hooks/uiHook';
import { authService } from '@/services/authService';
import { openPrivacyPolicy, openTermsOfUse } from '@/services/legalLinkService';

export default function ParentSettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { showSuccess, showError } = useUI();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/parent/selectchild' as never);
  };

  const handleDeleteAccount = async (payload: { password: string; confirmText: string }) => {
    setDeleting(true);
    try {
      const res = await authService.deleteAccount(payload);
      showSuccess(res.message || 'Account deletion requested.');
      setDeleteOpen(false);
      await logout();
      router.replace('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete account';
      showError(msg);
      throw err;
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.title} accessibilityRole="header">
          Account Settings
        </ThemedText>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Legal</ThemedText>
          <Pressable
            onPress={() => openPrivacyPolicy()}
            style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy">
            <ThemedText style={styles.linkButtonText}>Privacy Policy</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => openTermsOfUse()}
            style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
            accessibilityRole="link"
            accessibilityLabel="Terms of Use">
            <ThemedText style={styles.linkButtonText}>Terms of Use</ThemedText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Privacy & Security</ThemedText>
          <ThemedText style={styles.sectionBody}>
            You can permanently delete your parent account and all linked child profiles from
            Rise Up Kids. Access is revoked immediately; data purge is completed within 30 days.
          </ThemedText>

          <Pressable
            onPress={() => setDeleteOpen(true)}
            style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Delete my account">
            <ThemedText style={styles.dangerButtonText}>Delete my account</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      <Pressable
        onPress={handleBack}
        style={({ pressed }) => [styles.floatingBack, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <MaterialIcons name="arrow-back" size={26} color={colors.textInverse} />
      </Pressable>

      <DeleteAccountModal
        visible={deleteOpen}
        loading={deleting}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    padding: spacing[6],
    paddingBottom: spacing[20],
    gap: spacing[6],
  },
  title: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes['2xl'],
    color: colors.primary,
  },
  floatingBack: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[4],
    zIndex: 10,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  section: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    padding: spacing[5],
    gap: spacing[3],
  },
  sectionTitle: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.lg,
    color: colors.orange,
  },
  sectionBody: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  linkButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
  },
  linkButtonText: {
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.primary,
    fontSize: typography.sizes.base,
  },
  dangerButton: {
    marginTop: spacing[2],
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 2,
    borderColor: colors.error,
    borderRadius: radii.lg,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  dangerButtonText: {
    fontFamily: 'Quicksand_700Bold',
    color: colors.error,
    fontSize: typography.sizes.base,
  },
  pressed: {
    opacity: 0.85,
  },
});
