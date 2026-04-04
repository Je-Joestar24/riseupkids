import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

import { DECOR_SPIN_DURATION_MULTIPLIER, getLeafMotionCycleMs } from './constants';

export function useFloater(delayMs: number) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(y, {
          toValue: -8,
          duration: 1500,
          delay: delayMs,
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delayMs, y]);
  return y;
}

export function useLeafMotion(seed: number) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const duration = getLeafMotionCycleMs(seed);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: duration / 4, useNativeDriver: true }),
        Animated.timing(t, { toValue: 2, duration: duration / 4, useNativeDriver: true }),
        Animated.timing(t, { toValue: 3, duration: duration / 4, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: duration / 4, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [seed, t]);

  const translateX = t.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, -15, 0, 15],
  });
  const translateY = t.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, 20, 40, 20],
  });
  return { translateX, translateY };
}

export function useDecorSpin360(seed: number) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = getLeafMotionCycleMs(seed) * DECOR_SPIN_DURATION_MULTIPLIER;
    const half = duration / 2;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, {
          toValue: 1,
          duration: half,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(spin, {
          toValue: 0,
          duration: half,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [seed, spin]);

  return spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
}
