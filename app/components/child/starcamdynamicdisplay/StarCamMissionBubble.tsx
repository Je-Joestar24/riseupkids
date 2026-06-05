import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Image, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BACKEND_ORIGIN } from '@/config';

import { mapStyles } from './mapStyles';
import type { StarCamMapMissionItem } from './types';
import { useFloater } from './useStarCamMapMotion';

export interface StarCamMissionBubbleProps {
  item: StarCamMapMissionItem;
  size: number;
  delayMs: number;
  gradientColors: readonly [string, string, string];
  shadowColor: string;
  onPress: () => void;
}

export const StarCamMissionBubble = memo(function StarCamMissionBubble({
  item,
  size,
  delayMs,
  gradientColors,
  shadowColor,
  onPress,
}: StarCamMissionBubbleProps) {
  const floatY = useFloater(delayMs);
  const pulse = useRef(new Animated.Value(1)).current;
  const firstLetter = String(item.title || '?').trim().charAt(0).toUpperCase() || '?';
  const resolvedImageUrl = item.imageUrl
    ? /^(https?:|file:|content:)/i.test(item.imageUrl)
      ? item.imageUrl
      : `${BACKEND_ORIGIN}${item.imageUrl.startsWith('/') ? item.imageUrl : `/${item.imageUrl}`}`
    : null;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        mapStyles.missionWrap,
        {
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          transform: [{ translateY: floatY }],
        },
      ]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Start mission ${item.title}`}
        style={({ pressed }) => [pressed && mapStyles.missionPressed]}>
        <Animated.View
          style={[
            mapStyles.missionBubbleOuter,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ scale: pulse }],
              shadowColor,
            },
          ]}>
          <LinearGradient
            colors={[gradientColors[1], gradientColors[2]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: size - 16,
              height: size - 16,
              borderRadius: (size - 16) / 2,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
            {resolvedImageUrl ? (
              <Image
                source={{ uri: resolvedImageUrl }}
                accessibilityIgnoresInvertColors
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode="cover"
              />
            ) : (
              <ThemedText style={[mapStyles.missionFallbackLetter, { fontSize: size * 0.45 }]}>
                {firstLetter}
              </ThemedText>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});
