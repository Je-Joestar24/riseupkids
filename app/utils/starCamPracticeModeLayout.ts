/**
 * Star Cam practice layout for short phones (iPhone SE).
 * Video + sample squares shrink so both stay on screen with the target word.
 */

export interface StarCamPracticeModeInsets {
  top?: number;
  bottom?: number;
}

export interface StarCamPracticeModeLayout {
  compact: boolean;
  mediaSize: number;
  mediaRadius: number;
  titleFontSize: number;
  titleLineHeight: number;
  contentPaddingTop: number;
  targetFontSize: number;
  targetLineHeight: number;
  targetMargin: number;
}

const ROOT_BORDER = 16;
const HORIZONTAL_GUTTER = 48;
const PROGRESS_PILL_HEIGHT = 40;
const STACK_BREATHING = 12;
const MAX_MEDIA = 280;
const MIN_MEDIA = 128;

export function getStarCamPracticeModeLayout(
  windowWidth: number,
  windowHeight: number,
  insets: StarCamPracticeModeInsets = {}
): StarCamPracticeModeLayout {
  const compact = windowHeight < 720;
  const veryCompact = windowHeight < 640;
  const titleFontSize = veryCompact ? 28 : compact ? 34 : 42;
  const titleLineHeight = titleFontSize;
  const contentPaddingTop = veryCompact ? 24 : compact ? 32 : 40;
  const targetFontSize = veryCompact ? 22 : compact ? 26 : 34;
  const targetLineHeight = targetFontSize + 4;
  const targetMargin = veryCompact ? 6 : compact ? 10 : 20;
  const mediaRadius = veryCompact ? 18 : compact ? 22 : 28;

  const usableHeight =
    windowHeight - (insets.top ?? 0) - (insets.bottom ?? 0) - ROOT_BORDER;
  const chrome =
    contentPaddingTop +
    titleLineHeight +
    PROGRESS_PILL_HEIGHT +
    targetMargin +
    targetLineHeight +
    STACK_BREATHING;
  const heightCap = (usableHeight - chrome) / 2;
  const widthCap = Math.min(MAX_MEDIA, Math.max(MIN_MEDIA, windowWidth - HORIZONTAL_GUTTER - ROOT_BORDER));
  const mediaSize = Math.round(Math.min(MAX_MEDIA, widthCap, Math.max(MIN_MEDIA, heightCap)));

  return {
    compact,
    mediaSize,
    mediaRadius,
    titleFontSize,
    titleLineHeight,
    contentPaddingTop,
    targetFontSize,
    targetLineHeight,
    targetMargin,
  };
}
