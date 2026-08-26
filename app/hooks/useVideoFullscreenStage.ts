/**
 * Measure the fullscreen video viewport and contain-fit a 16:9 stage.
 * @see utils/videoPlayerFullscreenStage.ts
 */

import { useCallback, useContext, useMemo, useState } from 'react';
import { LayoutChangeEvent, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import {
  iosFullscreenOverlayShift,
  resolveVideoFullscreenStage,
} from '@/utils/videoPlayerFullscreenStage';

const ZERO_INSETS = { top: 0, bottom: 0, left: 0, right: 0 };

export function useVideoFullscreenStage(isFullscreen: boolean) {
  const { width: winW, height: winH } = useWindowDimensions();
  // Modal content can render outside SafeAreaProvider; never throw.
  const insets = useContext(SafeAreaInsetsContext) ?? ZERO_INSETS;
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport((prev) =>
      Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5
        ? prev
        : { width, height }
    );
  }, []);

  const stageStyle = useMemo(() => {
    if (!isFullscreen) return null;
    const size = resolveVideoFullscreenStage({
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      windowWidth: winW,
      windowHeight: winH,
      topInset: insets.top,
      platformOs: Platform.OS,
    });
    if (!(size.width > 0) || !(size.height > 0)) return null;
    return size;
  }, [isFullscreen, viewport.width, viewport.height, winW, winH, insets.top]);

  const overlayShiftStyle = useMemo(
    () => iosFullscreenOverlayShift(isFullscreen, insets.top, Platform.OS),
    [isFullscreen, insets.top]
  );

  return { stageStyle, onViewportLayout, overlayShiftStyle };
}
