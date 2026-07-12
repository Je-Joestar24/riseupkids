import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export interface StarCamPracticeMissingVideoSkipProps {
  accentColor: string;
}

export const StarCamPracticeMissingVideoSkip = memo(function StarCamPracticeMissingVideoSkip({
  accentColor,
}: StarCamPracticeMissingVideoSkipProps) {
  const fade = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const hop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fade.setValue(0);
    bounce.setValue(0);
    hop.setValue(1);

    const animation = Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounce, {
            toValue: -10,
            duration: 360,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(bounce, {
            toValue: 0,
            duration: 360,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 2 }
      ),
      Animated.sequence([
        Animated.timing(hop, {
          toValue: 1.08,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(hop, {
          toValue: 1,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start();
    return () => {
      animation.stop();
    };
  }, [bounce, fade, hop]);

  return (
    <View
      style={styles.centered}
      accessibilityRole="text"
      accessibilityLabel="No video for this word. Moving to the next practice.">
      <Animated.View
        style={[
          styles.iconWrap,
          {
            borderColor: accentColor,
            opacity: fade,
            transform: [{ translateY: bounce }, { scale: hop }],
          },
        ]}>
        <ThemedText style={styles.iconEmoji} accessibilityElementsHidden importantForAccessibility="no">
          ⭐
        </ThemedText>
      </Animated.View>
      <Animated.View style={{ opacity: fade }}>
        <ThemedText style={[styles.title, { color: accentColor }]}>No video this time!</ThemedText>
        <ThemedText style={[styles.subtitle, { color: accentColor }]}>
          Hopscotching to the next word...
        </ThemedText>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  iconEmoji: {
    fontSize: 30,
    lineHeight: 34,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 17,
    lineHeight: 22,
  },
  subtitle: {
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.88,
  },
});

export default StarCamPracticeMissingVideoSkip;
