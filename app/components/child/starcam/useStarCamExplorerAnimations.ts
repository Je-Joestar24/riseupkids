import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export function useStarCamExplorerAnimations() {
  const pulse = useRef(new Animated.Value(1)).current;
  const ping = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulse]);

  useEffect(() => {
    const pingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ping, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(ping, {
          toValue: 0.2,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pingLoop.start();
    return () => pingLoop.stop();
  }, [ping]);

  return { pulse, ping };
}
