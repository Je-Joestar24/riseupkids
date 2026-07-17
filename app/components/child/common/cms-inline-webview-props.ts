/**
 * WebView props for CMS inline/background video (demo, reward pages).
 * Disables iOS native AVPlayer fullscreen inside a locked-orientation modal.
 */

import { Platform } from 'react-native';

import { BUNNY_EMBED_WEBVIEW_PROPS } from './bunny-embed-webview';

/** Inline CMS video — plays in-page; no native fullscreen overlay on iOS. */
export const CMS_INLINE_WEBVIEW_PROPS = {
  ...BUNNY_EMBED_WEBVIEW_PROPS,
  allowsFullscreenVideo: Platform.OS === 'android',
  bounces: false,
  scrollEnabled: false,
  ...(Platform.OS === 'android'
    ? {
        allowFileAccess: true,
        allowFileAccessFromFileURLs: true,
        allowUniversalAccessFromFileURLs: true,
      }
    : {}),
};

/** WebView base URL / iOS read access for local `file://` video assets. */
export function resolveCmsInlineWebViewLocalAccess(uri: string): {
  baseUrl?: string;
  allowingReadAccessToURL?: string;
} {
  if (!uri.startsWith('file://')) return {};
  const directory = uri.slice(0, uri.lastIndexOf('/') + 1);
  return {
    baseUrl: directory,
    ...(Platform.OS === 'ios' ? { allowingReadAccessToURL: directory } : {}),
  };
}
