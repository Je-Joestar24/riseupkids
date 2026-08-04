/**
 * CMS built-in book player orientation lifecycle.
 *
 * Locks to a single landscape orientation while open so iPhone rotation cannot
 * flip into portrait (or the opposite landscape) and shrink/trap the stage.
 * Restores portrait when the player closes.
 */

import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

const PORTRAIT_LOCK = ScreenOrientation.OrientationLock.PORTRAIT_UP;

/**
 * Prefer one fixed landscape on iOS so users cannot flip the phone mid-book.
 * Android keeps a broader landscape lock as a fallback path.
 */
const CMS_IOS_FIXED_LANDSCAPE = ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT;

function getCmsLandscapeLockFallbacks(): ScreenOrientation.OrientationLock[] {
  if (Platform.OS === 'ios') {
    return [
      CMS_IOS_FIXED_LANDSCAPE,
      ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
      ScreenOrientation.OrientationLock.LANDSCAPE,
    ];
  }
  return [
    ScreenOrientation.OrientationLock.LANDSCAPE,
    ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT,
    ScreenOrientation.OrientationLock.LANDSCAPE_LEFT,
  ];
}

let cmsOrientationDepth = 0;
let orientationListener: ScreenOrientation.Subscription | null = null;

function isAllowedCmsOrientation(orientation: ScreenOrientation.Orientation): boolean {
  if (Platform.OS === 'ios') {
    return orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
  }
  return (
    orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
    orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
  );
}

async function applyCmsLandscapeLock(): Promise<boolean> {
  for (const lock of getCmsLandscapeLockFallbacks()) {
    try {
      // Avoid unlock-first on iOS — unlock briefly allows portrait and shrinks the stage.
      if (Platform.OS !== 'ios') {
        await ScreenOrientation.unlockAsync();
      }
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
    if (!isAllowedCmsOrientation(event.orientationInfo.orientation)) {
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
  if (cmsOrientationDepth > 1) {
    // Already locked — re-apply without stacking another restore.
    await applyCmsLandscapeLock();
    return;
  }

  startCmsOrientationGuard();
  await applyCmsLandscapeLock();
}

/**
 * Re-apply the fixed landscape lock without changing ref-count.
 * Use from Modal.onShow — iOS sometimes ignores the first lock.
 */
export async function reassertCmsPlayerLandscapeLock(): Promise<void> {
  if (Platform.OS === 'web' || cmsOrientationDepth <= 0) return;
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

/** Test helper — reset ref-count / listener between suites. */
export function resetCmsPlayerOrientationForTests(): void {
  cmsOrientationDepth = 0;
  stopCmsOrientationGuard();
}

/**
 * iOS Modal orientations for CMS built-in book player.
 * One landscape only — matching the fixed lock so flip cannot change layout.
 */
export const CMS_BOOK_PLAYER_MODAL_ORIENTATIONS = ['landscape-right'] as const;

/** Shared modal orientations for other video modals that may rotate freely on iOS. */
export const CMS_PLAYER_MODAL_ORIENTATIONS = [
  'portrait',
  'portrait-upside-down',
  'landscape',
  'landscape-left',
  'landscape-right',
] as const;
