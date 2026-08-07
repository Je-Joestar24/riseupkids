import { isRunningInExpoGo } from 'expo';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

type ExpoSplashNativeModule = {
  preventAutoHideAsync?: () => Promise<boolean | void>;
  hide?: () => unknown;
  hideAsync?: () => Promise<unknown>;
};

let preventPromise: Promise<boolean> | null = null;
let splashHidden = false;

function getSplashModule(): ExpoSplashNativeModule | null {
  return requireOptionalNativeModule<ExpoSplashNativeModule>('ExpoSplashScreen');
}

/**
 * Expo Go on iOS cannot reliably register/hide the splash view controller.
 * Calling hide() leaves an unhandled native promise rejection (RN "Uncaught (in promise)").
 */
function shouldSkipNativeSplash(): boolean {
  return Platform.OS === 'web' || (Platform.OS === 'ios' && isRunningInExpoGo());
}

function asPromise(value: unknown): Promise<unknown> | null {
  if (value != null && typeof (value as { then?: unknown }).then === 'function') {
    return value as Promise<unknown>;
  }
  return null;
}

/**
 * Start preventAutoHide as early as possible (Expo recommends global scope, not awaiting).
 * Returns whether the native splash was successfully kept visible.
 */
function ensurePreventStarted(): Promise<boolean> {
  if (shouldSkipNativeSplash()) {
    return Promise.resolve(false);
  }

  if (!preventPromise) {
    preventPromise = Promise.resolve()
      .then(async () => {
        const result = await SplashScreen.preventAutoHideAsync();
        return Boolean(result);
      })
      .catch(() => false);
  }

  return preventPromise;
}

/**
 * Keep the native splash visible until hideSplashScreen() is called.
 * Safe on web / Expo Go iOS when the native splash VC is unavailable.
 */
export function initSplashScreen(): void {
  void ensurePreventStarted();
}

/**
 * Hide the native splash once the app is ready.
 *
 * Important: do NOT use SplashScreen.hideAsync() alone — in expo-splash-screen the
 * native module's hide() return value is not awaited, so iOS rejections become
 * uncaught "No native splash screen registered..." promise errors.
 */
export async function hideSplashScreen(): Promise<void> {
  if (shouldSkipNativeSplash() || splashHidden) {
    splashHidden = true;
    return;
  }

  splashHidden = true;

  const prevented = await ensurePreventStarted();
  if (!prevented) {
    return;
  }

  try {
    const mod = getSplashModule();
    if (!mod) return;

    // Prefer awaiting the native promise directly so rejections are handled.
    if (typeof mod.hide === 'function') {
      const ret = mod.hide();
      const promise = asPromise(ret);
      if (promise) {
        await promise.catch(() => undefined);
      }
      return;
    }

    if (typeof mod.hideAsync === 'function') {
      await mod.hideAsync().catch(() => undefined);
    }
  } catch {
    // iOS VC remount / already dismissed — ignore.
  }
}

/** Test helper — reset module flags between Jest cases. */
export function resetSplashScreenForTests(): void {
  preventPromise = null;
  splashHidden = false;
}
