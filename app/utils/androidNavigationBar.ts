/**
 * Android immersive fullscreen (game-like) using SYSTEM_UI_FLAG_IMMERSIVE_STICKY.
 * Uses react-native-immersive-mode when available; no-op on iOS or if the native module isn't linked.
 * Requires a dev build (expo prebuild) or bare workflow — does not work in Expo Go.
 *
 * Hides BOTH:
 * - Status bar (clock / notifications)
 * - System navigation bar (Back, Home, Recents) — or the gesture pill when gesture nav is on
 *
 * App default on Android is immersive ON for the whole session (see useAndroidImmersiveFullscreen).
 */

import { Platform } from 'react-native';

type ImmersiveModule = {
  setBarMode: (mode: 'Normal' | 'Full' | 'FullSticky' | 'Bottom' | 'BottomSticky') => void;
  fullLayout?: (full: boolean) => void;
};

/** Minimum edge padding when system bars are hidden (gesture / cutout safety). */
export const ANDROID_MIN_EDGE_INSET = 12;

let immersiveModule: ImmersiveModule | null | undefined = undefined;

function getImmersive(): ImmersiveModule | null {
  if (immersiveModule !== undefined) return immersiveModule;
  if (Platform.OS !== 'android') {
    immersiveModule = null;
    return null;
  }
  try {
    immersiveModule = require('react-native-immersive-mode').default;
  } catch {
    immersiveModule = null;
  }
  return immersiveModule ?? null;
}

/** Hide/show the Android system navigation bar (Back / Home / Recents). iOS no-op. */
async function setAndroidNavigationBarHidden(hidden: boolean): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const NavigationBar = await import('expo-navigation-bar');
    await NavigationBar.setVisibilityAsync(hidden ? 'hidden' : 'visible');
  } catch {
    // Module missing or edge-to-edge OEM quirk — immersive flags still apply below.
  }
}

/**
 * Enter full immersive sticky mode: hide status bar and navigation bar (back, home, recents).
 * Uses SYSTEM_UI_FLAG_IMMERSIVE_STICKY — bars stay hidden until user swipes from edge.
 */
export function setImmersiveFullscreen(on: boolean): void {
  const imm = getImmersive();
  if (imm) {
    try {
      imm.setBarMode(on ? 'FullSticky' : 'Normal');
      if (imm.fullLayout) {
        imm.fullLayout(on);
      }
    } catch {
      // ignore
    }
  }
  // Reinforce nav-bar hide for 3-button navigation on modern / edge-to-edge Android.
  void setAndroidNavigationBarHidden(on);
}

/** Re-enter the app-wide Android immersive default (game-like sticky fullscreen). */
export function restoreAndroidImmersiveDefault(): void {
  setImmersiveFullscreen(true);
}

/**
 * Ensure usable padding when Android immersive mode collapses safe-area insets to 0.
 * On iOS, returns the inset unchanged.
 */
export function withMinAndroidInset(
  inset: number,
  min: number = ANDROID_MIN_EDGE_INSET
): number {
  if (Platform.OS !== 'android') return inset;
  return Math.max(inset, min);
}

/** @deprecated Use setImmersiveFullscreen(true). Kept for backwards compatibility. */
export async function hideAndroidNavigationBar(): Promise<void> {
  setImmersiveFullscreen(true);
}

/** @deprecated Use setImmersiveFullscreen(false). Kept for backwards compatibility. */
export async function showAndroidNavigationBar(): Promise<void> {
  setImmersiveFullscreen(false);
}
