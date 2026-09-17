/**
 * Pure Bunny WebView prop helpers (no react-native-webview import — Jest-safe).
 * @see docs/BUNNY_EMBED_WATCH_ONLY_PLAN.md
 */

import { Platform } from 'react-native';

import {
  BUNNY_EMBED_HOSTS,
  resolveBunnyNativeFullscreenAllowed,
  type BunnyEmbedInteractionMode,
} from '@/utils/bunnyExploreEmbed';

// Chunk 11 — Mobile App Security: WebView hardening. Restricted to the known Bunny embed hosts
// (the same set looksLikeBunnyExploreEmbedUrl() already validates against) instead of '*', which
// let this WebView navigate to any origin at all.
const BUNNY_EMBED_ORIGIN_WHITELIST = BUNNY_EMBED_HOSTS.map((host) => `https://${host}`);

/** WebView settings for Bunny Stream embed pages on iOS/Android preview builds. */
export const BUNNY_EMBED_WEBVIEW_PROPS = {
  originWhitelist: BUNNY_EMBED_ORIGIN_WHITELIST as string[],
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
