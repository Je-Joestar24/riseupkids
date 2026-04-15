import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { colors } from '@/config/theme/colors';

export interface StarCamMissionNotificationsProps {
  visible: boolean;
  tone: 'success' | 'retry';
  title: string;
  message?: string;
}

export const StarCamMissionNotifications = memo(function StarCamMissionNotifications({
  visible,
  tone,
  title,
  message,
}: StarCamMissionNotificationsProps) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const floatLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!visible) {
      floatLoopRef.current?.stop();
      floatAnim.setValue(0);
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 430,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 430,
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
  }, [visible, floatAnim, opacityAnim]);

  if (!visible) return null;

  const titleColor = tone === 'success' ? colors.secondary : colors.orange;
  const showMessage = Boolean(message?.trim());

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View style={[styles.card, { opacity: opacityAnim, transform: [{ translateY: floatAnim }] }]}>
        <ThemedText style={[styles.title, { color: titleColor }]}>{title}</ThemedText>
        {showMessage ? <ThemedText style={[styles.message, { color: titleColor }]}>{message}</ThemedText> : null}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    paddingHorizontal: 18,
    shadowColor: '#0f172a',
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: {
    textAlign: 'center',
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 62,
    lineHeight: 70,
  },
  message: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 24,
    lineHeight: 30,
  },
});

export default StarCamMissionNotifications;
