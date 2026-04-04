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
    const reservedTitleHeight = Math.round(titleLineHeight * 2.1);
    const maxLogoWidth = Math.min(width - spacing[4] * 2, 340);
    const logoHeight = Math.max(56, reservedTitleHeight - (showDecorEmojiStrip ? Math.round(titleLineHeight * 0.9) : 0));
    const logoWidth = Math.min(maxLogoWidth, Math.round(logoHeight * preset.header.aspectRatio));
    return (
      <View
        style={[
          mapStyles.headerTitleImageWrap,
          {
            minHeight: reservedTitleHeight,
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
            aspectRatio: preset.header.aspectRatio,
            alignSelf: 'center',
            maxHeight: logoHeight,
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
