import React, { memo } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';

import { mapStyles } from './mapStyles';
import { useDecorSpin360, useLeafMotion } from './useStarCamMapMotion';

export interface StarCamDecorEmojiProps {
  emoji: string;
  style: StyleProp<ViewStyle>;
  seed: number;
}

export const StarCamDecorEmoji = memo(function StarCamDecorEmoji({ emoji, style, seed }: StarCamDecorEmojiProps) {
  const { translateX, translateY } = useLeafMotion(seed);
  const rotate = useDecorSpin360(seed);

  return (
    <Animated.View
      style={[
        mapStyles.decorEmoji,
        style,
        {
          transform: [{ translateX }, { translateY }, { rotate }],
        },
      ]}>
      <ThemedText style={mapStyles.decorEmojiText}>{emoji}</ThemedText>
    </Animated.View>
  );
});
