/**
 * Rise Up Kids theme colors
 * Used by useThemeColor and components. Re-exports from config/theme for compatibility.
 */

import { colors } from '@/config/theme/colors';
import { Platform } from 'react-native';

// Light mode - Rise Up Kids palette
const tintColorLight = colors.secondary;

// Dark mode - inverted for readability
const tintColorDark = colors.secondary;

export const Colors = {
  light: {
    text: colors.text,
    background: '#ffffff',
    tint: tintColorLight,
    icon: colors.textMuted,
    tabIconDefault: colors.textMuted,
    tabIconSelected: tintColorLight,
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
  },
  dark: {
    text: colors.textInverse,
    background: '#0f172a',
    tint: tintColorDark,
    icon: colors.textMuted,
    tabIconDefault: colors.textMuted,
    tabIconSelected: tintColorDark,
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Menlo',
  },
  default: {
    sans: 'System',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: 'sans-serif',
    mono: "Menlo, Monaco, Consolas, monospace",
  },
});
