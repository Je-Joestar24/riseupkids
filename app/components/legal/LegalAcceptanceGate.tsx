import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { openPrivacyPolicy, openTermsOfUse } from '@/services/legalLinkService';

interface LegalAcceptanceGateProps {
  visible: boolean;
  onAccept: () => Promise<void>;
}

export function LegalAcceptanceGate({ visible, onAccept }: LegalAcceptanceGateProps) {
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!checked || submitting) return;
    setSubmitting(true);
    try {
      await onAccept();
      setChecked(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        /* Required for Android back — user must accept to continue */
      }}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.logoWrap}>
            <Image
              source={require('@/assets/images/big-logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="Rise Up Kids logo"
            />
          </View>

          <View style={styles.card} accessibilityRole="summary" accessibilityLabel="Legal agreement">
            <ThemedText style={styles.title} accessibilityRole="header">
              Welcome to Rise Up Kids
            </ThemedText>
            <ThemedText style={styles.lead}>
              Rise Up Kids is a parent-managed learning app for children. A parent or legal
              guardian must create the account and supervise use of the app.
            </ThemedText>
            <ThemedText style={styles.body}>
              Before you continue, please review our Terms of Use and Privacy Policy. They explain
              how we handle parent and child information, including learning progress, optional
              photos and audio, and your parental choices.
            </ThemedText>

            <View style={styles.linkRow}>
              <Pressable
                onPress={() => openTermsOfUse()}
                style={styles.docLink}
                accessibilityRole="link"
                accessibilityLabel="Read Terms of Use">
                <MaterialIcons name="description" size={20} color={colors.primary} />
                <ThemedText style={styles.docLinkText}>Terms of Use</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => openPrivacyPolicy()}
                style={styles.docLink}
                accessibilityRole="link"
                accessibilityLabel="Read Privacy Policy">
                <MaterialIcons name="privacy-tip" size={20} color={colors.primary} />
                <ThemedText style={styles.docLinkText}>Privacy Policy</ThemedText>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setChecked((value) => !value)}
              style={styles.checkboxRow}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel="I have read and accept the Terms of Use and Privacy Policy">
              <MaterialIcons
                name={checked ? 'check-box' : 'check-box-outline-blank'}
                size={28}
                color={checked ? colors.primary : colors.textSecondary}
              />
              <ThemedText style={styles.checkboxLabel}>
                I have read and accept the{' '}
                <ThemedText style={styles.checkboxEmphasis}>Terms of Use</ThemedText> and{' '}
                <ThemedText style={styles.checkboxEmphasis}>Privacy Policy</ThemedText>.
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleContinue}
              disabled={!checked || submitting}
              style={({ pressed }) => [
                styles.continueButton,
                (!checked || submitting) && styles.continueButtonDisabled,
                pressed && checked && !submitting && styles.continueButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue"
              accessibilityState={{ disabled: !checked || submitting }}>
              {submitting ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <ThemedText style={styles.continueText}>Continue</ThemedText>
              )}
            </Pressable>

            <ThemedText style={styles.note}>
              You must accept to use Rise Up Kids. If you do not agree, please close the app.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgLogin,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[6],
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  logo: {
    width: 140,
    height: 140,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[6],
    gap: spacing[4],
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes['2xl'],
    color: colors.primary,
    textAlign: 'center',
  },
  lead: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.base,
    color: colors.text,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  linkRow: {
    gap: spacing[3],
  },
  docLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  docLinkText: {
    fontFamily: 'Quicksand_600SemiBold',
    fontSize: typography.sizes.base,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.sm,
    color: colors.text,
    lineHeight: 22,
  },
  checkboxEmphasis: {
    fontFamily: 'Quicksand_700Bold',
    color: colors.primary,
  },
  continueButton: {
    backgroundColor: colors.btnTeal,
    borderRadius: radii.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  continueButtonPressed: {
    opacity: 0.92,
  },
  continueButtonDisabled: {
    opacity: 0.55,
  },
  continueText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes.lg,
    color: colors.textInverse,
  },
  note: {
    fontFamily: 'Quicksand_500Medium',
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
