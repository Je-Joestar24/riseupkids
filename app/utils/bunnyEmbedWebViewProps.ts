/**
 * Pure Bunny WebView prop helpers (no react-native-webview import — Jest-safe).
 * @see docs/BUNNY_EMBED_WATCH_ONLY_PLAN.md
 */

import { Platform } from 'react-native';

import {
  resolveBunnyNativeFullscreenAllowed,
  type BunnyEmbedInteractionMode,
} from '@/utils/bunnyExploreEmbed';

/** WebView settings for Bunny Stream embed pages on iOS/Android preview builds. */
export const BUNNY_EMBED_WEBVIEW_PROPS = {
  originWhitelist: ['*'] as string[],
  allowsFullscreenVideo: false,
  allowsInlineMediaPlayback: true,
  mediaPlaybackRequiresUserAction: false,
  allowsAirPlayForMediaPlayback: false,
  javaScriptEnabled: true,
  domStorageEnabled: true,
  mixedContentMode: 'always' as const,
  androidLayerType: 'hardware' as const,
  setSupportMultipleWindows: false,
  bounces: false,
  scalesPageToFit: true,
  automaticallyAdjustContentInsets: false,
};

export function buildBunnyEmbedWebViewProps(
  interactionMode: BunnyEmbedInteractionMode = 'watchOnly',
  allowNativeFullscreen = false
) {
  const nativeFs = resolveBunnyNativeFullscreenAllowed(
    interactionMode,
    allowNativeFullscreen
  );
  return {
    ...BUNNY_EMBED_WEBVIEW_PROPS,
    allowsFullscreenVideo: nativeFs && Platform.OS !== 'web',
    allowsAirPlayForMediaPlayback: false,
    ...(Platform.OS === 'ios'
      ? {
          contentInsetAdjustmentBehavior: 'never' as const,
          dataDetectorTypes: 'none' as const,
        }
      : {}),
  };
}
