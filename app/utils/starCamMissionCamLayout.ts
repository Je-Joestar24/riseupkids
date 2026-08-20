/**
 * Star Cam mission cam layout for short phones (iPhone SE).
 * Magnifier shrinks so CHECK OBJECT stays on screen.
 */

export interface StarCamMissionCamInsets {
  top?: number;
  bottom?: number;
}

export interface StarCamMissionCamLayout {
  compact: boolean;
  contentPaddingTop: number;
  starSize: number;
  promptFontSize: number;
  promptLineHeight: number;
  magnifierSize: number;
  cameraSize: number;
  magnifierOverlayTop: number;
  footerPaddingBottom: number;
}

const ROOT_BORDER = 16;
const MAX_MAGNIFIER = 430;
const MIN_MAGNIFIER = 220;
const MAGNIFIER_OVERLAY_RATIO = 150 / 430;
const CAMERA_RATIO = 0.75;
const LISTEN_BUTTON_HEIGHT = 42;
const CAPTURE_BUTTON_HEIGHT = 56;
const STACK_GAPS = 24;

export function getStarCamMissionCamLayout(
  windowWidth: number,
  windowHeight: number,
  insets: StarCamMissionCamInsets = {}
): StarCamMissionCamLayout {
  const compact = windowHeight < 720;
  const veryCompact = windowHeight < 640;
  const contentPaddingTop = veryCompact ? 72 : compact ? 88 : 116;
  const starSize = veryCompact ? 22 : compact ? 26 : 30;
  const promptFontSize = veryCompact ? 22 : compact ? 26 : 34;
  const promptLineHeight = veryCompact ? 26 : compact ? 32 : 40;
  const footerPaddingBottom = veryCompact ? 10 : compact ? 12 : 20;

  const usableHeight =
    windowHeight - (insets.top ?? 0) - (insets.bottom ?? 0) - ROOT_BORDER;
  const chrome =
    contentPaddingTop +
    promptLineHeight +
    LISTEN_BUTTON_HEIGHT +
    CAPTURE_BUTTON_HEIGHT +
    footerPaddingBottom +
    STACK_GAPS;
  const heightCap = usableHeight - chrome;
  const widthCap = Math.min(MAX_MAGNIFIER, Math.round(windowWidth * 1.15));
  const magnifierSize = Math.round(
    Math.min(MAX_MAGNIFIER, widthCap, Math.max(MIN_MAGNIFIER, heightCap))
  );

  return {
    compact,
    contentPaddingTop,
    starSize,
    promptFontSize,
    promptLineHeight,
    magnifierSize,
    cameraSize: Math.round(magnifierSize * CAMERA_RATIO),
    magnifierOverlayTop: Math.round(magnifierSize * MAGNIFIER_OVERLAY_RATIO),
    footerPaddingBottom,
  };
}
