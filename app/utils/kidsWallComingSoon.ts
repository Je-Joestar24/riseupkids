/**
 * Kids Wall "Coming Soon" gate (iOS App Store / social-sharing restrictions).
 *
 * Production: automatically enabled on iOS.
 * Preview on PC / Android / web: set EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW=true
 *   in app/.env (or eas.json env) and restart Expo with cache clear if needed.
 * Disable on iOS builds if needed: EXPO_PUBLIC_KIDS_WALL_COMING_SOON=false
 */

import { Platform } from 'react-native';

export function isKidsWallComingSoonPreviewForced(): boolean {
  return process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW === 'true';
}

/** iOS Coming Soon is on by default; set EXPO_PUBLIC_KIDS_WALL_COMING_SOON=false to turn off. */
export function isKidsWallComingSoonEnabledForIos(): boolean {
  return process.env.EXPO_PUBLIC_KIDS_WALL_COMING_SOON !== 'false';
}

export function isKidsWallComingSoon(
  platform: typeof Platform.OS = Platform.OS
): boolean {
  if (isKidsWallComingSoonPreviewForced()) return true;
  return platform === 'ios' && isKidsWallComingSoonEnabledForIos();
}

/** Footer tab label when Coming Soon is active. */
export function getKidsWallNavLabel(
  platform: typeof Platform.OS = Platform.OS
): string {
  return isKidsWallComingSoon(platform) ? 'Soon' : "Kid's Wall";
}
