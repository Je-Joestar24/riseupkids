/**
 * Rise Up Kids theme
 * Exports light theme and theme utilities
 */

import { colors } from './colors';
import { radii } from './radii';
import { spacing } from './spacing';
import { typography } from './typography';

export { colors } from './colors';
export { radii } from './radii';
export { spacing } from './spacing';
export { typography, fonts, fontQuicksand } from './typography';

export const lightTheme = {
  colors,
  spacing,
  typography,
  radii,
} as const;

export type Theme = typeof lightTheme;
