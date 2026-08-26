/**
 * Landscape fullscreen 16:9 stage for module / explore video modals.
 * iPhone SE (and other short iPhones) keep a status-bar gap in transparent
 * Modals; size from the measured box so the video is not pushed off-screen.
 */

import { computeCmsPlayerStageSize } from '@/components/child/common/cms-player-shared';

export function resolveVideoFullscreenStage(input: {
  viewportWidth: number;
  viewportHeight: number;
  windowWidth: number;
  windowHeight: number;
  topInset: number;
  platformOs: string;
}): { width: number; height: number } {
  const boxW = input.viewportWidth > 1 ? input.viewportWidth : input.windowWidth;
  const iosTop = input.platformOs === 'ios' ? Math.max(0, input.topInset) : 0;
  const boxH =
    input.viewportHeight > 1
      ? input.viewportHeight
      : Math.max(0, input.windowHeight - iosTop);
  return computeCmsPlayerStageSize(boxW, boxH, { platformOs: input.platformOs });
}

/** Pull the fullscreen overlay up under the leftover iOS status-bar inset. */
export function iosFullscreenOverlayShift(
  isFullscreen: boolean,
  topInset: number,
  platformOs: string
): { marginTop: number } | null {
  if (!isFullscreen || platformOs !== 'ios' || !(topInset > 0)) return null;
  return { marginTop: -topInset };
}
