import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Quicksand } from '@/constants/theme';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export interface StarCamMissionPreloadOverlayProps {
  visible: boolean;
  progress: number;
  missionTitle?: string;
  gradientColors?: readonly [string, string, string];
  borderColor?: string;
  failedCount?: number;
  errorMessage?: string | null;
  onDismiss?: () => void;
}

export const StarCamMissionPreloadOverlay = memo(function StarCamMissionPreloadOverlay({
  visible,
  progress,
  missionTitle,
  gradientColors = ['#fde8de', '#f5c7b8', colors.orange],
  borderColor = colors.orange,
  failedCount = 0,
  errorMessage = null,
  onDismiss,
}: StarCamMissionPreloadOverlayProps) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      accessibilityViewIsModal
      onRequestClose={() => onDismiss?.()}>
      <View style={styles.backdrop}>
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1], gradientColors[2]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.fill}>
          <View
            style={[styles.card, { borderColor }]}
            accessibilityRole="progressbar"
            accessibilityLabel="Preparing mission media"
            accessibilityValue={{ min: 0, max: 100, now: safeProgress }}>
            <ThemedText style={styles.title}>Getting your mission ready</ThemedText>
            <ThemedText style={styles.subtitle}>
              {missionTitle
                ? `Loading sounds and pictures for “${missionTitle}”…`
                : 'Loading sounds and pictures for smooth play…'}
            </ThemedText>

            <View style={styles.track} accessibilityLabel="Mission preload progress">
              <View style={[styles.fillBar, { width: `${safeProgress}%` }]} />
            </View>

            <ThemedText style={styles.percent}>{safeProgress}% ready</ThemedText>

            {errorMessage ? (
              <ThemedText style={styles.error}>{errorMessage}</ThemedText>
            ) : failedCount > 0 ? (
              <ThemedText style={styles.warn}>
                Some files could not be saved on device, but your mission will still work.
              </ThemedText>
            ) : null}
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  fill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: radii.xl,
    borderWidth: 3,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: Quicksand.bold,
    textAlign: 'center',
    color: colors.text,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing[5],
    lineHeight: Math.round(typography.sizes.sm * 1.4),
  },
  track: {
    height: 14,
    borderRadius: radii.full,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    marginBottom: spacing[3],
  },
  fillBar: {
    height: '100%',
    borderRadius: radii.full,
    backgroundColor: colors.orange,
  },
  percent: {
    fontSize: typography.sizes.lg,
    fontFamily: Quicksand.bold,
    textAlign: 'center',
    color: colors.text,
  },
  warn: {
    marginTop: spacing[3],
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  error: {
    marginTop: spacing[3],
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    color: '#c0392b',
    fontFamily: Quicksand.bold,
  },
});

export default StarCamMissionPreloadOverlay;
