/**
 * CMS built-in book player orientation lifecycle.
 *
 * Locks strictly to landscape while the CMS player is open (game-style).
 * Restores portrait when the player closes.
 */

import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

const PORTRAIT_LOCK = ScreenOrientation.OrientationLock.PORTRAIT_UP;

/** Both landscape directions — never portrait while CMS book player is active. */
const CMS_LANDSCAPE_LOCK = ScreenOrientation.OrientationLock.LANDSCAPE;

const CMS_LANDSCAPE_LOCK_FALLBACKS: ScreenOrientation.OrientationLock[] = [
  CMS_LANDSCAPE_LOCK,
  ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
  ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
];

let cmsOrientationDepth = 0;
let orientationListener: ScreenOrientation.Subscription | null = null;

function isPortraitOrientation(orientation: ScreenOrientation.Orientation): boolean {
  return (
    orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
    orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN
  );
}

async function applyCmsLandscapeLock(): Promise<boolean> {
  for (const lock of CMS_LANDSCAPE_LOCK_FALLBACKS) {
    try {
      await ScreenOrientation.unlockAsync();
      await ScreenOrientation.lockAsync(lock);
      return true;
    } catch {
      // Try the next landscape lock variant (iOS/Android differ).
    }
  }
  return false;
}

function startCmsOrientationGuard(): void {
  if (orientationListener || Platform.OS === 'web') return;

  orientationListener = ScreenOrientation.addOrientationChangeListener((event) => {
    if (cmsOrientationDepth <= 0) return;
    if (isPortraitOrientation(event.orientationInfo.orientation)) {
      void applyCmsLandscapeLock();
    }
  });
}

function stopCmsOrientationGuard(): void {
  orientationListener?.remove();
  orientationListener = null;
}

export async function prepareCmsPlayerOrientation(): Promise<void> {
  if (Platform.OS === 'web') return;

  cmsOrientationDepth += 1;
  if (cmsOrientationDepth > 1) return;

  startCmsOrientationGuard();
  await applyCmsLandscapeLock();
}

export async function restoreAppPortraitOrientation(): Promise<void> {
  if (Platform.OS === 'web') return;

  cmsOrientationDepth = Math.max(0, cmsOrientationDepth - 1);
  if (cmsOrientationDepth > 0) return;

  stopCmsOrientationGuard();

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

/** iOS Modal orientations for CMS built-in book player — landscape only. */
export const CMS_BOOK_PLAYER_MODAL_ORIENTATIONS = [
  'landscape',
  'landscape-left',
  'landscape-right',
] as const;

/** Shared modal orientations for other video modals that may rotate freely on iOS. */
export const CMS_PLAYER_MODAL_ORIENTATIONS = [
  'portrait',
  'portrait-upside-down',
  'landscape',
  'landscape-left',
  'landscape-right',
] as const;
