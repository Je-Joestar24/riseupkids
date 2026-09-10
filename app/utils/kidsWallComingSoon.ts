/**
 * Kids Wall platform gate.
 *
 * Kids Wall (child photo sharing) is an **Android / Web-only** feature. On iOS it is hidden
 * entirely — no navigation entry, and the wall routes redirect to Home — so the App Store build
 * contains no reachable photo-sharing UI and no "coming soon" placeholder (App Store review
 * guideline 2.1, and the stricter kids-app UGC rules). The privacy policy states the same.
 *
 * Overrides:
 *   - EXPO_PUBLIC_KIDS_WALL_COMING_SOON=false   → force-enable Kids Wall on an iOS build.
 *   - EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW=true → force the hidden state on every platform
 *     (for QA on PC / Android). Wins over the line above.
 *
 * The name is historical (it used to show a "Coming Soon" screen); it now means "hidden".
 */

import { Platform } from 'react-native';

export function isKidsWallComingSoonPreviewForced(): boolean {
  return process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW === 'true';
}

/** iOS hides Kids Wall by default; set EXPO_PUBLIC_KIDS_WALL_COMING_SOON=false to turn it back on. */
export function isKidsWallComingSoonEnabledForIos(): boolean {
  return process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON !== 'false';
}

/** True when Kids Wall must be hidden from navigation and its routes must redirect away. */
export function isKidsWallComingSoon(
  platform: typeof Platform.OS = Platform.OS
): boolean {
  if (isKidsWallComingSoonPreviewForced()) return true;
  return platform === 'ios' && isKidsWallComingSoonEnabledForIos();
}

/** Alias with a name that matches what it now does. Prefer this in new code. */
export const isKidsWallHidden = isKidsWallComingSoon;
