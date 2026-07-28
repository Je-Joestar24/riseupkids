/**
 * Android-only: enter game-like immersive sticky fullscreen on launch and
 * re-apply when the app returns to foreground (OS may restore system bars).
 * No-op on iOS.
 */

import { useEffect } from 'react';
import { AppState, Platform, StatusBar } from 'react-native';

import { restoreAndroidImmersiveDefault } from '@/utils/androidNavigationBar';

function applyAndroidImmersive(): void {
  restoreAndroidImmersiveDefault();
  StatusBar.setHidden(true, 'fade');
}

export function useAndroidImmersiveFullscreen(): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    applyAndroidImmersive();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        applyAndroidImmersive();
      }
    });

    return () => {
      sub.remove();
    };
  }, []);
}
