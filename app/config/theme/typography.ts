/**
 * Rise Up Kids typography
 * Child-friendly sizes and weights
 */

import { Platform } from 'react-native';

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
};

/** Quicksand - primary app font (matches web) */
export const fontQuicksand = 'Quicksand';

export const fonts = Platform.select({
  ios: {
    sans: fontQuicksand,
    serif: 'Georgia',
    rounded: fontQuicksand,
    mono: 'Menlo',
  },
  android: {
    sans: fontQuicksand,
    serif: 'serif',
    rounded: fontQuicksand,
    mono: 'monospace',
  },
  default: {
    sans: fontQuicksand,
    serif: 'serif',
    rounded: fontQuicksand,
    mono: 'monospace',
  },
});

export type TypographySize = keyof typeof typography.sizes;
export type TypographyWeight = keyof typeof typography.weights;
