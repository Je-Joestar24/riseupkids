/**
 * Shared Bunny Stream WebView settings and inline player for React Native.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import {
  buildBunnyEmbedWebViewUrl,
  looksLikeBunnyExploreEmbedUrl,
} from '@/utils/bunnyExploreEmbed';

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

export interface BunnyEmbedWebViewProps {
  embedUrl: string | null;
  title?: string;
  style?: object;
  onLoadEnd?: () => void;
  onError?: () => void;
  showLoadingOverlay?: boolean;
}

export function BunnyEmbedWebView({
  embedUrl,
  title = 'Video',
  style,
  onLoadEnd,
  onError,
  showLoadingOverlay = true,
}: BunnyEmbedWebViewProps) {
  const [webLoading, setWebLoading] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const validEmbed = useMemo(
    () => (embedUrl && looksLikeBunnyExploreEmbedUrl(embedUrl) ? embedUrl.trim() : null),
    [embedUrl]
  );

  const webViewSource = useMemo(
    () => (validEmbed ? { uri: buildBunnyEmbedWebViewUrl(validEmbed) } : null),
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
    <View style={[styles.fill, style]}>
      <WebView
        {...BUNNY_EMBED_WEBVIEW_PROPS}
        source={webViewSource}
        style={StyleSheet.absoluteFill}
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
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
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
