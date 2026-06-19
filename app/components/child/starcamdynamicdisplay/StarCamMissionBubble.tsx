import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';

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
  isPreparing?: boolean;
  onPress: () => void;
}

export const StarCamMissionBubble = memo(function StarCamMissionBubble({
  item,
  size,
  delayMs,
  gradientColors,
  shadowColor,
  isPreparing = false,
  onPress,
}: StarCamMissionBubbleProps) {
  const floatY = useFloater(delayMs);
  const pulse = useRef(new Animated.Value(1)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const [imageFailed, setImageFailed] = useState(false);
  const innerSize = size - 16;

  const resolvedImageUrl = item.imageUrl
    ? /^(https?:|file:|content:)/i.test(item.imageUrl)
      ? item.imageUrl
      : `${BACKEND_ORIGIN}${item.imageUrl.startsWith('/') ? item.imageUrl : `/${item.imageUrl}`}`
    : null;

  const showImage = Boolean(resolvedImageUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
    imageOpacity.setValue(0);
  }, [resolvedImageUrl, imageOpacity]);

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

  const handleImageLoad = () => {
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  };

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
          opacity: isPreparing ? 0.88 : 1,
        },
      ]}>
      <Pressable
        onPress={onPress}
        disabled={isPreparing}
        accessibilityRole="button"
        accessibilityLabel={`Start mission ${item.title}`}
        accessibilityState={{ busy: isPreparing }}
        style={({ pressed }) => [pressed && !isPreparing && mapStyles.missionPressed]}>
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
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
            {showImage ? (
              <Animated.Image
                source={{ uri: resolvedImageUrl || '' }}
                accessibilityIgnoresInvertColors
                style={{
                  width: '100%',
                  height: '100%',
                  opacity: imageOpacity,
                }}
                resizeMode="cover"
                onLoad={handleImageLoad}
                onError={() => setImageFailed(true)}
              />
            ) : null}

            {isPreparing ? (
              <View style={styles.preparingOverlay} pointerEvents="none">
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : null}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  preparingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 999,
  },
});
