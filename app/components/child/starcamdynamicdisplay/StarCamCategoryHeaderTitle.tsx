import React, { memo } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { spacing } from '@/config/theme/spacing';

import { mapStyles } from './mapStyles';
import type { StarCamCategoryPreset } from './types';

export interface StarCamCategoryHeaderTitleProps {
  preset: StarCamCategoryPreset;
  titleFontSize: number;
  titleLineHeight: number;
}

export const StarCamCategoryHeaderTitle = memo(function StarCamCategoryHeaderTitle({
  preset,
  titleFontSize,
  titleLineHeight,
}: StarCamCategoryHeaderTitleProps) {
  const { width } = useWindowDimensions();

  if (preset.header.kind === 'image') {
    const showDecorEmojiStrip = preset.header.showDecorEmojiStrip !== false;
    // Keep image headers compact so bubbles retain map space on smaller phones.
    const maxLogoWidth = Math.min(width - spacing[4] * 2, 320);
    const baseLogoHeight = Math.round(Math.min(92, Math.max(56, width * 0.2)));
    const emojiStripHeight = showDecorEmojiStrip ? Math.round(titleLineHeight * 0.85) : 0;
    const logoHeight = Math.max(48, baseLogoHeight - Math.round(emojiStripHeight * 0.25));
    const logoWidth = Math.min(maxLogoWidth, Math.round(logoHeight * preset.header.aspectRatio));
    const reservedTitleHeight = logoHeight + emojiStripHeight + spacing[1];
    return (
      <View
        style={[
          mapStyles.headerTitleImageWrap,
          {
            height: reservedTitleHeight,
            justifyContent: 'center',
          },
        ]}
        accessibilityRole="header">
        {showDecorEmojiStrip ? (
          <View style={mapStyles.headerImageEmojiRow} accessibilityLabel="Category title decorations">
            <ThemedText style={[mapStyles.headerImageEmojiStrip, { lineHeight: titleLineHeight }]}>🍃🍂🌿</ThemedText>
          </View>
        ) : null}
        <Image
          source={preset.header.source}
          accessibilityLabel={preset.header.accessibilityLabel}
          accessibilityRole="image"
          importantForAccessibility="yes"
          style={{
            width: logoWidth,
            height: logoHeight,
            alignSelf: 'center',
          }}
          resizeMode="contain"
        />
      </View>
    );
  }

  const lines = preset.header.title.split('\n');
  return (
    <View style={mapStyles.headerTextBlock} accessibilityRole="header">
      {lines.map((line, idx) => (
        <ThemedText
          key={`${idx}-${line.slice(0, 8)}`}
          style={[
            mapStyles.headerTitle,
            {
              fontSize: titleFontSize,
              lineHeight: titleLineHeight,
              marginTop: idx > 0 ? Math.round(titleLineHeight * 0.08) : 0,
            },
          ]}>
          {line}
        </ThemedText>
      ))}
    </View>
  );
});
