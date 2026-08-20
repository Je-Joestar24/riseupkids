/**
 * Star Cam mission success layout for short phones (iPhone SE).
 * Reward card shrinks so STAR CAM and PLAY AGAIN stay on screen.
 */

export interface StarCamMissionSuccessInsets {
  top?: number;
  bottom?: number;
}

export interface StarCamMissionSuccessLayout {
  compact: boolean;
  contentPaddingTop: number;
  titleFontSize: number;
  titleLineHeight: number;
  titleMarginTop: number;
  mediaSize: number;
  mediaRadius: number;
  missionFontSize: number;
  missionLineHeight: number;
  subtitleFontSize: number;
  subtitleLineHeight: number;
  subtitleMarginBottom: number;
  footerPaddingBottom: number;
  primaryButtonHeight: number;
  secondaryButtonHeight: number;
  cameraIconSize: number;
}

const ROOT_BORDER = 16;
const HORIZONTAL_GUTTER = 36;
const MAX_MEDIA = 320;
const MIN_MEDIA = 148;
const PRIMARY_BUTTON = 56;
const SECONDARY_BUTTON = 48;
const FOOTER_HINT = 18;
const ACTION_GAPS = 16;

export function getStarCamMissionSuccessLayout(
  windowWidth: number,
  windowHeight: number,
  insets: StarCamMissionSuccessInsets = {}
): StarCamMissionSuccessLayout {
  const compact = windowHeight < 720;
  const veryCompact = windowHeight < 640;
  const contentPaddingTop = veryCompact ? 24 : compact ? 32 : 64;
  const titleFontSize = veryCompact ? 28 : compact ? 32 : 42;
  const titleLineHeight = veryCompact ? 32 : compact ? 36 : 46;
  const titleMarginTop = veryCompact ? 4 : compact ? 8 : 16;
  const missionFontSize = veryCompact ? 20 : compact ? 22 : 28;
  const missionLineHeight = veryCompact ? 24 : compact ? 26 : 34;
  const subtitleFontSize = veryCompact ? 16 : compact ? 18 : 22;
  const subtitleLineHeight = veryCompact ? 20 : compact ? 22 : 28;
  const subtitleMarginBottom = veryCompact ? 6 : compact ? 8 : 16;
  const footerPaddingBottom = veryCompact ? 8 : compact ? 10 : 24;
  const primaryButtonHeight = veryCompact ? 48 : PRIMARY_BUTTON;
  const secondaryButtonHeight = veryCompact ? 42 : SECONDARY_BUTTON;
  const cameraIconSize = veryCompact ? 20 : 24;
  const mediaRadius = veryCompact ? 18 : compact ? 22 : 28;

  const usableHeight =
    windowHeight - (insets.top ?? 0) - (insets.bottom ?? 0) - ROOT_BORDER;
  const chrome =
    contentPaddingTop +
    titleMarginTop +
    titleLineHeight +
    10 +
    missionLineHeight +
    12 +
    subtitleLineHeight +
    subtitleMarginBottom +
    primaryButtonHeight +
    FOOTER_HINT +
    secondaryButtonHeight +
    ACTION_GAPS +
    footerPaddingBottom;
  const heightCap = usableHeight - chrome;
  const widthCap = Math.min(MAX_MEDIA, windowWidth - HORIZONTAL_GUTTER - ROOT_BORDER);
  const mediaSize = Math.round(Math.min(MAX_MEDIA, widthCap, Math.max(MIN_MEDIA, heightCap)));

  return {
    compact,
    contentPaddingTop,
    titleFontSize,
    titleLineHeight,
    titleMarginTop,
    mediaSize,
    mediaRadius,
    missionFontSize,
    missionLineHeight,
    subtitleFontSize,
    subtitleLineHeight,
    subtitleMarginBottom,
    footerPaddingBottom,
    primaryButtonHeight,
    secondaryButtonHeight,
    cameraIconSize,
  };
}
