/**
 * CMS built-in book completion — parity with frontend/src/components/child/common/cmsCompletionDialog.jsx
 * Small screens (iPhone SE): scrollable body + sticky Continue so the action is never clipped.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Quicksand } from '@/constants/theme';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

export interface CmsCompletionDialogData {
  score?: number;
  maxScore?: number;
  attemptCount?: number;
  starsAwarded?: boolean;
  starsToAward?: number;
  totalStars?: number;
  readingCount?: number;
  requiredReadingCount?: number;
  requirementMet?: boolean;
}

export interface CmsCompletionDialogProps {
  open: boolean;
  onClose: () => void;
  data: CmsCompletionDialogData | null;
}

const FOOTER_RESERVE = 88;

export function CmsCompletionDialog({ open, onClose, data }: CmsCompletionDialogProps) {
  const insets = useSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  const compact = winH < 700 || winW < 380;
  const {
    score = 0,
    maxScore = 0,
    attemptCount = 0,
    starsAwarded,
    starsToAward = 0,
    totalStars,
    readingCount = 0,
    requiredReadingCount = 5,
    requirementMet = false,
  } = data || {};

  const remaining = Math.max(requiredReadingCount - readingCount, 0);
  const maxCardHeight = Math.max(
    280,
    winH - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - spacing[4] * 2
  );

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View
        style={[
          styles.backdrop,
          {
            paddingTop: Math.max(insets.top, spacing[3]),
            paddingBottom: Math.max(insets.bottom, spacing[3]),
          },
        ]}
        accessibilityRole="none"
        accessibilityLabel="Completion dialog backdrop"
      >
        <View
          style={[styles.cardWrap, { maxHeight: maxCardHeight }]}
          accessibilityRole="none"
        >
          <ScrollView
            style={[styles.scroll, { maxHeight: Math.max(160, maxCardHeight - FOOTER_RESERVE) }]}
            contentContainerStyle={[
              styles.scrollContent,
              compact && styles.scrollContentCompact,
            ]}
            showsVerticalScrollIndicator
            bounces
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            accessibilityLabel="Completion details"
          >
            <Text style={[styles.title, compact && styles.titleCompact]} accessibilityRole="header">
              🎉 Great Job! 🎉
            </Text>

            <MaterialCommunityIcons
              name="check-circle"
              size={compact ? 52 : 80}
              color={colors.success}
              style={styles.checkIcon}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />

            <Text style={[styles.lead, compact && styles.leadCompact]} accessibilityRole="text">
              You finished the book!
            </Text>

            <View style={styles.metricBox} accessibilityRole="summary">
              <Text style={styles.metricTitle}>
                Score: {score} / {maxScore}
              </Text>
              <Text style={styles.metricSub}>Attempts: {attemptCount}</Text>
            </View>

            <View style={styles.metricBox} accessibilityRole="summary">
              <Text style={styles.metricTitle}>
                Reading Progress: {readingCount} / {requiredReadingCount}
              </Text>
              {!requirementMet && (
                <Text style={styles.hint}>
                  Read {remaining} more time{remaining !== 1 ? 's' : ''} to earn stars!
                </Text>
              )}
            </View>

            {starsAwarded && starsToAward > 0 ? (
              <View style={styles.starsBox} accessibilityRole="summary">
                <Text style={styles.starsTitle}>Stars Earned:</Text>
                <View style={styles.starsRow}>
                  <MaterialCommunityIcons name="star" size={compact ? 28 : 40} color={colors.warning} />
                  <Text style={[styles.starsBig, compact && styles.starsBigCompact]}>+{starsToAward}</Text>
                </View>
                {totalStars !== undefined && (
                  <Text style={styles.totalStars}>Total Stars: {totalStars}</Text>
                )}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.continueBtn, pressed && styles.continueBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={styles.continueLabel}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  cardWrap: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  scroll: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  scrollContentCompact: {
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  title: {
    fontFamily: Quicksand.bold,
    fontSize: 26,
    color: colors.success,
    textAlign: 'center',
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  titleCompact: {
    fontSize: 22,
    paddingTop: spacing[1],
  },
  checkIcon: {
    alignSelf: 'center',
    marginBottom: spacing[2],
  },
  lead: {
    fontFamily: Quicksand.semiBold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing[3],
  },
  leadCompact: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: spacing[2],
  },
  metricBox: {
    marginVertical: spacing[2],
    padding: spacing[4],
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  metricTitle: {
    fontFamily: Quicksand.bold,
    fontSize: 16,
    color: colors.text,
  },
  metricSub: {
    fontFamily: Quicksand.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing[2],
  },
  hint: {
    fontFamily: Quicksand.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing[2],
  },
  starsBox: {
    marginVertical: spacing[3],
    padding: spacing[4],
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.warning,
    backgroundColor: 'rgba(242, 175, 16, 0.12)',
  },
  starsTitle: {
    fontFamily: Quicksand.semiBold,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  starsBig: {
    fontFamily: Quicksand.bold,
    fontSize: 36,
    color: colors.warning,
  },
  starsBigCompact: {
    fontSize: 28,
  },
  totalStars: {
    fontFamily: Quicksand.semiBold,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.bgTertiary,
    backgroundColor: colors.bgCard,
  },
  continueBtn: {
    alignSelf: 'center',
    minWidth: 180,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
  },
  continueBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  continueLabel: {
    fontFamily: Quicksand.bold,
    fontSize: 18,
    color: colors.textInverse,
    textAlign: 'center',
  },
});
