/**
 * CMS built-in book completion — parity with frontend/src/components/child/common/cmsCompletionDialog.jsx
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Quicksand } from '@/constants/theme';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
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

export function CmsCompletionDialog({ open, onClose, data }: CmsCompletionDialogProps) {
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

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.backdrop}
        onPress={(e) => e.stopPropagation()}
        accessibilityRole="none"
        accessibilityLabel="Completion dialog backdrop"
      >
        <Pressable
          style={styles.cardWrap}
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="none"
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title} accessibilityRole="header">
              🎉 Great Job! 🎉
            </Text>

            <MaterialCommunityIcons
              name="check-circle"
              size={80}
              color={colors.success}
              style={styles.checkIcon}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />

            <Text style={styles.lead} accessibilityRole="text">
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
                  <MaterialCommunityIcons name="star" size={40} color={colors.warning} />
                  <Text style={styles.starsBig}>+{starsToAward}</Text>
                </View>
                {totalStars !== undefined && (
                  <Text style={styles.totalStars}>Total Stars: {totalStars}</Text>
                )}
              </View>
            ) : null}

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.continueBtn, pressed && styles.continueBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <Text style={styles.continueLabel}>Continue</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  cardWrap: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
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
    padding: spacing[3],
    paddingBottom: spacing[6],
  },
  title: {
    fontFamily: Quicksand.bold,
    fontSize: 26,
    color: colors.success,
    textAlign: 'center',
    paddingTop: spacing[6],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
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
  totalStars: {
    fontFamily: Quicksand.semiBold,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  continueBtn: {
    marginTop: spacing[4],
    alignSelf: 'center',
    minWidth: 200,
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    borderWidth: 3,
    borderColor: colors.primary,
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
