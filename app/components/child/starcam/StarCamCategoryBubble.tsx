import React, { memo, useCallback } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

import { BUBBLE_SIZE, PING_SIZE } from './constants';
import type { StarCamBubblePreset } from './types';

export interface StarCamCategoryBubbleProps {
  item: StarCamBubblePreset;
  pulse: Animated.Value;
  ping: Animated.Value;
  onPress: (categoryKey: string) => void;
}

export const StarCamCategoryBubble = memo(function StarCamCategoryBubble({
  item,
  pulse,
  ping,
  onPress,
}: StarCamCategoryBubbleProps) {
  const handlePress = useCallback(() => {
    onPress(item.key);
  }, [item.key, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
      style={({ pressed }) => [
        styles.bubblePressable,
        { left: item.left, top: item.top },
        pressed && styles.bubblePressed,
      ]}>
      <Animated.View
        style={[
          styles.bubble,
          {
            backgroundColor: item.color,
            borderColor: '#fffefd',
            transform: [{ scale: pulse }],
            shadowColor: item.color,
          },
        ]}>
        <View style={styles.bubbleInner}>
          {item.iconType === 'image' && item.image ? (
            <Image
              source={item.image}
              style={styles.bubbleImage}
              resizeMode="contain"
              accessibilityLabel={`${item.title} icon`}
            />
          ) : (
            <ThemedText style={styles.bubbleEmoji}>{item.emoji ?? '⭐'}</ThemedText>
          )}
          <Animated.View
            style={[
              styles.pingDot,
              {
                opacity: ping,
                transform: [{ scale: ping }],
              },
            ]}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  bubblePressable: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
  },
  bubblePressed: {
    opacity: 0.88,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  bubbleInner: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bubbleImage: {
    width: 106,
    height: 106,
  },
  bubbleEmoji: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '700',
  },
  pingDot: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: PING_SIZE,
    height: PING_SIZE,
    borderRadius: PING_SIZE / 2,
    backgroundColor: '#fff',
  },
});
