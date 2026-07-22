import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

let splashPrevented = false;
let splashHidden = false;

/**
 * Keep the native splash visible until hideSplashScreen() is called.
 * Safe on web and when the native module is unavailable (Expo Go edge cases).
 */
export async function initSplashScreen(): Promise<void> {
  if (Platform.OS === 'web' || splashPrevented) {
    return;
  }

  try {
    await SplashScreen.preventAutoHideAsync();
    splashPrevented = true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[SplashScreen] preventAutoHideAsync failed:', error);
    }
  }
}

/**
 * Hide the native splash once the app is ready.
 * No-op if preventAutoHideAsync did not succeed or hide was already called.
 */
export async function hideSplashScreen(): Promise<void> {
  if (Platform.OS === 'web' || splashHidden || !splashPrevented) {
    return;
  }

  try {
    await SplashScreen.hideAsync();
    splashHidden = true;
  } catch (error) {
    if (__DEV__) {
      console.warn('[SplashScreen] hideAsync failed:', error);
    }
  }
}
