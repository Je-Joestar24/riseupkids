import React, { memo } from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

import { mapStyles } from './mapStyles';

export interface StarCamMapFooterHintProps {
  text: string;
  fontSize: number;
  lineHeight: number;
}

export const StarCamMapFooterHint = memo(function StarCamMapFooterHint({
  text,
  fontSize,
  lineHeight,
}: StarCamMapFooterHintProps) {
  return (
    <View style={mapStyles.footerBlock}>
      <ThemedText
        style={[
          mapStyles.footerHint,
          {
            color: 'rgba(255,255,255,0.92)',
            fontSize,
            lineHeight,
          },
        ]}>
        {text}
      </ThemedText>
    </View>
  );
});
