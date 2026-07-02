/**
 * Shared Bunny Stream WebView settings and inline player for React Native.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { BUNNY_EMBED_REFERER } from '@/config';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import {
  buildBunnyEmbedWebViewUrl,
  looksLikeBunnyExploreEmbedUrl,
} from '@/utils/bunnyExploreEmbed';
import * as ScreenOrientation from 'expo-screen-orientation';

/** WebView settings for Bunny Stream embed pages on iOS/Android preview builds. */
export const BUNNY_EMBED_WEBVIEW_PROPS = {
  originWhitelist: ['*'],
  allowsFullscreenVideo: true,
  allowsInlineMediaPlayback: true,
  mediaPlaybackRequiresUserAction: false,
  javaScriptEnabled: true,
  domStorageEnabled: true,
  mixedContentMode: 'always' as const,
  androidLayerType: 'hardware' as const,
  setSupportMultipleWindows: false,
  bounces: false,
  scalesPageToFit: true,
};

export function buildBunnyEmbedWebViewProps(allowNativeFullscreen = true) {
  return {
    ...BUNNY_EMBED_WEBVIEW_PROPS,
    allowsFullscreenVideo: allowNativeFullscreen && Platform.OS !== 'web',
  };
}

export interface BunnyEmbedWebViewProps {
  embedUrl: string | null;
  title?: string;
  style?: object;
  onLoadEnd?: () => void;
  onError?: () => void;
  showLoadingOverlay?: boolean;
  /** When true (default), iOS can enter native AVPlayer fullscreen. Disable for inline CMS backgrounds. */
  allowNativeFullscreen?: boolean;
}

export function BunnyEmbedWebView({
  embedUrl,
  title = 'Video',
  style,
  onLoadEnd,
  onError,
  showLoadingOverlay = true,
  allowNativeFullscreen = true,
}: BunnyEmbedWebViewProps) {
  const [webLoading, setWebLoading] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const webViewProps = useMemo(
    () => buildBunnyEmbedWebViewProps(allowNativeFullscreen),
    [allowNativeFullscreen]
  );

  useEffect(() => {
    if (!allowNativeFullscreen || Platform.OS !== 'ios') return;

    void ScreenOrientation.unlockAsync().catch(() => {});

    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [allowNativeFullscreen]);

  const validEmbed = useMemo(
    () => (embedUrl && looksLikeBunnyExploreEmbedUrl(embedUrl) ? embedUrl.trim() : null),
    [embedUrl]
  );

  const webViewSource = useMemo(
    () =>
      validEmbed
        ? {
            uri: buildBunnyEmbedWebViewUrl(validEmbed),
            headers: {
              Referer: BUNNY_EMBED_REFERER,
              referer: BUNNY_EMBED_REFERER,
            },
          }
        : null,
    [validEmbed]
  );

  const handleLoadEnd = useCallback(() => {
    setWebLoading(false);
    onLoadEnd?.();
  }, [onLoadEnd]);

  const handleError = useCallback(() => {
    setPlaybackError('The video could not load. Check your connection and try again.');
    setWebLoading(false);
    onError?.();
  }, [onError]);

  if (!webViewSource) {
    return (
      <View style={[styles.fill, styles.centered, style]}>
        <ThemedText style={styles.errorText}>
          No Bunny embed URL is available for this video.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.fill, style]} collapsable={false}>
      <WebView
        {...webViewProps}
        source={webViewSource}
        style={styles.webView}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleError}
        accessibilityLabel={`Bunny embed playback for ${title}`}
      />
      {playbackError ? (
        <View style={styles.errorBanner} pointerEvents="none">
          <ThemedText style={styles.errorText}>{playbackError}</ThemedText>
        </View>
      ) : null}
      {showLoadingOverlay && webLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.secondary} />
          <ThemedText style={styles.loadingText}>Loading video...</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
  },
  loadingText: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textInverse,
  },
  errorBanner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.error,
    textAlign: 'center',
  },
});
