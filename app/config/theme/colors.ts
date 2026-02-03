/**
 * Rise Up Kids theme colors
 * Mirrors frontend/src/config/themeColors.js for consistency across web and app
 */

export const colors = {
  // Primary
  primary: '#85c2b9',
  secondary: '#62caca',
  accent: '#f2af10',
  orange: '#e98a68',
  success: '#10b981',
  warning: '#f2af10',
  error: '#ef4444',

  // Backgrounds
  bgSolid: '#62caca',
  bgSecondary: '#85c2b9',
  bgTertiary: '#f1f5f9',
  bgCard: 'rgba(255, 255, 255, 0.95)',
  bgOverlay: 'rgba(255, 255, 255, 0.9)',
  bgLogin: 'rgb(244, 237, 216)',

  // Gradient colors (use with expo-linear-gradient)
  gradientStart: '#62caca',
  gradientMid: '#85c2b9',
  gradientEnd: '#62caca',
  orangeGradient: '#e98a68',

  // Text
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textInverse: '#ffffff',
  textTeal: '#62caca',

  // Borders
  border: '#e2e8f0',
  borderSecondary: '#cbd5e1',
  borderAccent: 'rgba(242, 175, 16, 0.3)',
  borderOrange: 'rgba(233, 138, 104, 0.3)',

  // Buttons
  btnYellow: '#f2af10',
  btnTeal: '#62caca',
  btnOrange: '#e98a68',
} as const;

export type ColorToken = keyof typeof colors;
