import { CMS_IOS_STAGE_FIT_SCALE } from '@/components/child/common/cms-player-shared';
import {
  iosFullscreenOverlayShift,
  resolveVideoFullscreenStage,
} from '@/utils/videoPlayerFullscreenStage';

/** iPhone SE 2/3 landscape logical size. */
const SE_LANDSCAPE_W = 667;
const SE_LANDSCAPE_H = 375;
const SE_STATUS_BAR = 20;

describe('resolveVideoFullscreenStage', () => {
  it('fits iPhone SE landscape after the status-bar gap so the video is not clipped', () => {
    const stage = resolveVideoFullscreenStage({
      viewportWidth: 0,
      viewportHeight: 0,
      windowWidth: SE_LANDSCAPE_W,
      windowHeight: SE_LANDSCAPE_H,
      topInset: SE_STATUS_BAR,
      platformOs: 'ios',
    });
    const availableH = SE_LANDSCAPE_H - SE_STATUS_BAR;
    expect(stage.height).toBeLessThanOrEqual(availableH + 0.5);
    expect(stage.width).toBeLessThanOrEqual(SE_LANDSCAPE_W + 0.5);
    expect(stage.width / stage.height).toBeCloseTo(16 / 9, 5);
  });

  it('uses the measured viewport when the modal is shorter than the window', () => {
    const measuredH = SE_LANDSCAPE_H - SE_STATUS_BAR;
    const stage = resolveVideoFullscreenStage({
      viewportWidth: SE_LANDSCAPE_W,
      viewportHeight: measuredH,
      windowWidth: SE_LANDSCAPE_W,
      windowHeight: SE_LANDSCAPE_H,
      topInset: SE_STATUS_BAR,
      platformOs: 'ios',
    });
    expect(stage.height).toBeLessThanOrEqual(measuredH + 0.5);
    expect(stage.height).toBeCloseTo(measuredH * CMS_IOS_STAGE_FIT_SCALE, 5);
  });

  it('does not subtract a top inset on Android', () => {
    const stage = resolveVideoFullscreenStage({
      viewportWidth: 0,
      viewportHeight: 0,
      windowWidth: SE_LANDSCAPE_W,
      windowHeight: SE_LANDSCAPE_H,
      topInset: SE_STATUS_BAR,
      platformOs: 'android',
    });
    expect(stage.height).toBeCloseTo(SE_LANDSCAPE_H, 5);
  });
});

describe('iosFullscreenOverlayShift', () => {
  it('pulls the overlay up by the iOS status-bar inset in fullscreen', () => {
    expect(iosFullscreenOverlayShift(true, 20, 'ios')).toEqual({ marginTop: -20 });
    expect(iosFullscreenOverlayShift(true, 0, 'ios')).toBeNull();
    expect(iosFullscreenOverlayShift(false, 20, 'ios')).toBeNull();
    expect(iosFullscreenOverlayShift(true, 20, 'android')).toBeNull();
  });
});
