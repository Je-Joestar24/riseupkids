/**
 * Star Cam mission start layout for short phones (iPhone SE).
 * Image/title shrink so START MISSION stays on screen.
 */

export interface StarCamMissionStartLayout {
  compact: boolean;
  imageSize: number;
  titleFontSize: number;
  titleLineHeight: number;
  titleMarginBottom: number;
  imageMarginBottom: number;
  contentPaddingTop: number;
  footerPaddingBottom: number;
  descriptionFontSize: number;
  descriptionLineHeight: number;
  descriptionMaxLines: number;
  descriptionMaxHeight: number;
}

export function getStarCamMissionStartLayout(
  windowWidth: number,
  windowHeight: number
): StarCamMissionStartLayout {
  const compact = windowHeight < 720;
  const veryCompact = windowHeight < 640;
  const horizontalRoom = Math.max(160, windowWidth - 80);
  const heightCap = veryCompact ? windowHeight * 0.28 : compact ? windowHeight * 0.32 : 292;
  const imageSize = Math.round(Math.min(292, horizontalRoom, Math.max(148, heightCap)));
  const descriptionFontSize = veryCompact ? 15 : compact ? 16 : 19;
  const descriptionLineHeight = veryCompact ? 20 : compact ? 22 : 26;
  const descriptionMaxLines = veryCompact ? 2 : compact ? 3 : 5;

  return {
    compact,
    imageSize,
    titleFontSize: veryCompact ? 32 : compact ? 38 : 46,
    titleLineHeight: veryCompact ? 38 : compact ? 46 : 56,
    titleMarginBottom: veryCompact ? 12 : compact ? 16 : 28,
    imageMarginBottom: veryCompact ? 12 : compact ? 16 : 28,
    contentPaddingTop: veryCompact ? 48 : compact ? 64 : 86,
    footerPaddingBottom: veryCompact ? 8 : compact ? 12 : 20,
    descriptionFontSize,
    descriptionLineHeight,
    descriptionMaxLines,
    descriptionMaxHeight: descriptionMaxLines * descriptionLineHeight,
  };
}
