import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';

/**
 * Screen-capture protection is ON everywhere unless one of these two settings turns it off:
 *
 * - EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE=true — set only by the dedicated `screenshots` EAS profile
 *   (App Store screenshots can't be taken otherwise); production never sets it.
 * - EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE=true — for local development in Expo Go / a dev build, set
 *   in `app/.env`. It is honored ONLY while running in development (`__DEV__`): a release build
 *   ignores it even if it is left in `.env`, so it can never weaken a store build.
 *
 * Anything else — setting missing, empty, "TRUE", "1" — keeps the protection on.
 */
export function isScreenCaptureAllowed(isDev: boolean = __DEV__): boolean {
  if (process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE === 'true') return true;
  return isDev && process.env.EXPO_PUBLIC_DEV_ALLOW_SCREEN_CAPTURE === 'true';
}

/** Applies the protection for `key` and returns the cleanup that releases it. */
export function applyScreenCaptureGuard(key: string, allowed: boolean = isScreenCaptureAllowed()): () => void {
  if (allowed) return () => {};

  preventScreenCaptureAsync(key).catch(() => {});
  return () => {
    allowScreenCaptureAsync(key).catch(() => {});
  };
}
