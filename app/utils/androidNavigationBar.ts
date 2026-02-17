/**
 * Android immersive fullscreen (game-like) using SYSTEM_UI_FLAG_IMMERSIVE_STICKY.
 * Uses react-native-immersive-mode when available; no-op on iOS or if the native module isn't linked.
 * Requires a dev build (expo prebuild) or bare workflow — does not work in Expo Go.
 */

import { Platform } from 'react-native';

type ImmersiveModule = {
  setBarMode: (mode: 'Normal' | 'Full' | 'FullSticky' | 'Bottom' | 'BottomSticky') => void;
  fullLayout?: (full: boolean) => void;
};

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

/**
 * Enter full immersive sticky mode: hide status bar and navigation bar (back, home, recents).
 * Uses SYSTEM_UI_FLAG_IMMERSIVE_STICKY — bars stay hidden until user swipes from edge.
 */
export function setImmersiveFullscreen(on: boolean): void {
  const imm = getImmersive();
  if (!imm) return;
  try {
    imm.setBarMode(on ? 'FullSticky' : 'Normal');
    if (imm.fullLayout) {
      imm.fullLayout(on);
    }
  } catch {
    // ignore
  }
}

/** @deprecated Use setImmersiveFullscreen(true). Kept for backwards compatibility. */
export async function hideAndroidNavigationBar(): Promise<void> {
  setImmersiveFullscreen(true);
}

/** @deprecated Use setImmersiveFullscreen(false). Kept for backwards compatibility. */
export async function showAndroidNavigationBar(): Promise<void> {
  setImmersiveFullscreen(false);
}
