/**
 * CMS built-in book player orientation lifecycle.
 *
 * iOS crashes when lockAsync(LANDSCAPE) runs against a portrait-only Info.plist,
 * or when WebView/Bunny native fullscreen fights a forced orientation lock.
 * Unlock first, lock landscape best-effort, restore portrait on exit.
 */

import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

const PORTRAIT_LOCK = ScreenOrientation.OrientationLock.PORTRAIT_UP;
/** LANDSCAPE_RIGHT is more stable on iOS than the generic LANDSCAPE lock. */
const CMS_LANDSCAPE_LOCK = ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT;

let cmsOrientationDepth = 0;

export async function prepareCmsPlayerOrientation(): Promise<void> {
  if (Platform.OS === 'web') return;

  cmsOrientationDepth += 1;
  if (cmsOrientationDepth > 1) return;

  try {
    await ScreenOrientation.unlockAsync();
    await ScreenOrientation.lockAsync(CMS_LANDSCAPE_LOCK);
  } catch {
    // Portrait-only builds or simulators: stay unlocked — 16:9 stage still renders in portrait.
    try {
      await ScreenOrientation.unlockAsync();
    } catch {
      // no-op
    }
    cmsOrientationDepth = 0;
  }
}

export async function restoreAppPortraitOrientation(): Promise<void> {
  if (Platform.OS === 'web') return;

  cmsOrientationDepth = Math.max(0, cmsOrientationDepth - 1);
  if (cmsOrientationDepth > 0) return;

  try {
    await ScreenOrientation.unlockAsync();
    await ScreenOrientation.lockAsync(PORTRAIT_LOCK);
  } catch {
    try {
      await ScreenOrientation.unlockAsync();
    } catch {
      // no-op
    }
  }
}

/** Fire-and-forget helper used before opening the CMS player modal. */
export function lockLandscapeForCmsBookPlayer(): void {
  void prepareCmsPlayerOrientation();
}

/** iOS Modal must allow rotation while CMS player (and Bunny fullscreen) is active. */
export const CMS_PLAYER_MODAL_ORIENTATIONS = [
  'portrait',
  'portrait-upside-down',
  'landscape',
  'landscape-left',
  'landscape-right',
] as const;
