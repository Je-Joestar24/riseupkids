/**
 * Cover for an experience with no picture: a soft gradient, a bright round badge with a white sparkle in the
 * middle, and a few small stars and dots around it. Clean and cheerful, and only decoration (hidden from screen
 * readers; the card's title says what it is). Fills the box it is placed in.
 *
 * Three colour sets are taken in turn by the card's place in the list, so a row of cover-less experiences looks
 * lively instead of repeating one grey box. The colours are the child screens' own. Same drawing as the website.
 */

import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

export const COVER_PALETTES = [
  { from: '#fde8de', to: '#f1ebd4', main: '#e98a68', accent: '#f2af10', dot: '#85c2b9' },
  { from: '#d1e2df', to: '#f1ebd4', main: '#5aa79b', accent: '#f2af10', dot: '#e98a68' },
  { from: '#fff3c9', to: '#fde8de', main: '#f2af10', accent: '#e98a68', dot: '#85c2b9' },
] as const;

/** The colour set for a card in place `index` (wraps around, and tolerates a missing or odd index). */
export function coverPalette(index: unknown): (typeof COVER_PALETTES)[number] {
  const n = Number.isInteger(index) ? (index as number) : 0;
  const size = COVER_PALETTES.length;
  return COVER_PALETTES[((n % size) + size) % size];
}

export function ExperienceCoverPlaceholder({ index = 0 }: { index?: number }) {
  const { from, to, main, accent, dot } = coverPalette(index);

  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
      testID="experience-cover-placeholder"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height="100%" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice">
        <Circle cx="160" cy="100" r="62" fill="#fff" opacity={0.55} />
        <Circle cx="160" cy="100" r="40" fill={main} />
        <Path d="M160 78 L166.5 93.5 L182 100 L166.5 106.5 L160 122 L153.5 106.5 L138 100 L153.5 93.5 Z" fill="#fff" />
        <Path d="M62 32 L66.5 43.5 L78 48 L66.5 52.5 L62 64 L57.5 52.5 L46 48 L57.5 43.5 Z" fill={accent} />
        <Path d="M70 138 L73 146 L81 149 L73 152 L70 160 L67 152 L59 149 L67 146 Z" fill={main} opacity={0.85} />
        <Circle cx="262" cy="46" r="9" fill={dot} />
        <Circle cx="254" cy="152" r="6" fill={accent} opacity={0.9} />
        <Circle cx="286" cy="104" r="4" fill={main} opacity={0.7} />
      </Svg>
    </LinearGradient>
  );
}
