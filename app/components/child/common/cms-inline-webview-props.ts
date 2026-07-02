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
};
