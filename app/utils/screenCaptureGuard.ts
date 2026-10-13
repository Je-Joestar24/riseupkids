import { allowScreenCaptureAsync, preventScreenCaptureAsync } from 'expo-screen-capture';

/**
 * Screen-capture protection is ON in every build unless that build was made with
 * EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE=true. Only the dedicated `screenshots` EAS profile sets it
 * (App Store screenshots can't be taken otherwise); production never does.
 */
export function isScreenCaptureAllowed(): boolean {
  return process.env.EXPO_PUBLIC_ALLOW_SCREEN_CAPTURE === 'true';
}

/** Applies the protection for `key` and returns the cleanup that releases it. */
export function applyScreenCaptureGuard(key: string, allowed: boolean = isScreenCaptureAllowed()): () => void {
  if (allowed) return () => {};

  preventScreenCaptureAsync(key).catch(() => {});
  return () => {
    allowScreenCaptureAsync(key).catch(() => {});
  };
}
