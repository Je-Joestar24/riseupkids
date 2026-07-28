/**
 * Landscape fullscreen for child video modals (module + explore).
 * Mirrors HTML5 / CMS fullscreen: lock landscape, immersive on Android,
 * restore portrait + app immersive default on exit.
 */

import { useCallback, useEffect, useState } from 'react';
import { Platform, StatusBar } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { restoreAndroidImmersiveDefault } from '@/utils/androidNavigationBar';

const PORTRAIT = ScreenOrientation.OrientationLock.PORTRAIT_UP;
const LANDSCAPE = ScreenOrientation.OrientationLock.LANDSCAPE;

export function useVideoPlayerFullscreen(open: boolean) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(LANDSCAPE);
      setIsFullscreen(true);
      StatusBar.setHidden(true, 'slide');
      if (Platform.OS === 'android') {
        restoreAndroidImmersiveDefault();
      }
    } catch {
      // ignore orientation / immersive failures
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(PORTRAIT);
      setIsFullscreen(false);
      if (Platform.OS === 'android') {
        StatusBar.setHidden(true, 'fade');
        restoreAndroidImmersiveDefault();
      } else {
        StatusBar.setHidden(false, 'slide');
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!open) {
      void exitFullscreen();
      return;
    }
    // Start in portrait card mode whenever the modal opens.
    void exitFullscreen();
  }, [open, exitFullscreen]);

  return { isFullscreen, enterFullscreen, exitFullscreen };
}
