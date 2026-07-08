/**
 * Child-friendly success / retry popup for CMS drag activities.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Quicksand } from '@/constants/theme';
import { colors } from '@/config/theme/colors';

export type CmsInteractiveResultTone = 'success' | 'retry';

export interface CmsInteractiveResultToastProps {
  visible: boolean;
  tone: CmsInteractiveResultTone;
  /** When set (retry state), tapping the backdrop resets the activity. */
  onDismiss?: () => void;
}

const COPY = {
  success: {
    title: 'You did it!',
    message: 'Amazing work — keep going!',
    emoji: '🎉',
  },
  retry: {
    title: 'Nice try!',
    message: 'Tap the background or the retry button to try again!',
    emoji: '💪',
  },
};

export const CmsInteractiveResultToast = memo(function CmsInteractiveResultToast({
  visible,
  tone,
  onDismiss,
}: CmsInteractiveResultToastProps) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const floatLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) {
      floatLoopRef.current?.stop();
      floatAnim.setValue(0);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.82,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 520,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 520,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
    };
  }, [visible, floatAnim, opacityAnim, scaleAnim]);

  if (!visible) return null;

  const copy = COPY[tone];
  const isSuccess = tone === 'success';
  const accent = isSuccess ? colors.secondary : colors.orange;

  const content = (
    <>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} pointerEvents="none" />

      <Animated.View
        style={[
          styles.cardWrap,
          {
            opacity: opacityAnim,
            transform: [{ translateY: floatAnim }, { scale: scaleAnim }],
          },
        ]}
        pointerEvents="none"
      >
        <View style={[styles.card, { borderColor: accent }]}>
          <View style={styles.sparkleRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[styles.sparkle, { backgroundColor: accent }]} />
            <View style={[styles.sparkle, styles.sparkleMid, { backgroundColor: colors.accent }]} />
            <View style={[styles.sparkle, { backgroundColor: accent }]} />
          </View>

          <View style={[styles.iconBadge, { backgroundColor: `${accent}18`, borderColor: accent }]}>
            <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {copy.emoji}
            </Text>
          </View>

          <Text style={[styles.title, { color: accent }]} accessibilityRole="header">
            {copy.title}
          </Text>
          <Text style={styles.message} accessibilityRole="text">
            {copy.message}
          </Text>

          {isSuccess ? (
            <View style={styles.starRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <MaterialCommunityIcons name="star" size={22} color={colors.accent} />
              <MaterialCommunityIcons name="star" size={28} color={colors.secondary} />
              <MaterialCommunityIcons name="star" size={22} color={colors.accent} />
            </View>
          ) : null}
        </View>
      </Animated.View>
    </>
  );

  if (onDismiss) {
    return (
      <Pressable
        style={styles.overlay}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Tap background to try again"
        accessibilityLiveRegion="polite"
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={styles.overlay}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={`${copy.title} ${copy.message}`}
    >
      {content}
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
  },
  cardWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    borderRadius: 28,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 3,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  sparkleRow: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  sparkle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.85,
  },
  sparkleMid: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: -4,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emoji: {
    fontSize: 38,
    lineHeight: 44,
  },
  title: {
    fontFamily: Quicksand.bold,
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontFamily: Quicksand.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
});
