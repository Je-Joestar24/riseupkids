/**
 * Shared Bunny Stream WebView settings and inline player for React Native.
 * Child default: hide Bunny chrome, autoplay, no native fullscreen.
 * Invisible wall tap toggles play/pause (in-page gesture so iOS can resume).
 * @see docs/BUNNY_EMBED_WATCH_ONLY_PLAN.md
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { BUNNY_EMBED_REFERER } from '@/config';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { ensureCmsPlaybackAudioMode } from '@/utils/cmsPlaybackAudio';
import {
  BUNNY_EMBED_IOS_INSTALLER_RETRY_MS,
  BUNNY_EMBED_LOADING_TIMEOUT_MS,
  buildBunnyEmbedPlayWallInstallerScript,
  buildBunnyEmbedTogglePlaybackScript,
  isBunnyEmbedPlayWallReadyMessage,
  isFatalBunnyEmbedHttpError,
  shouldUncoverBunnyWebViewForGestures,
} from '@/utils/bunnyEmbedPlayScript';
import {
  buildBunnyEmbedWebViewUrl,
  looksLikeBunnyExploreEmbedUrl,
  shouldBlockBunnyTouch,
  type BunnyEmbedInteractionMode,
  type BunnyEmbedPlaybackPreset,
} from '@/utils/bunnyExploreEmbed';
import {
  BUNNY_EMBED_WEBVIEW_PROPS,
  buildBunnyEmbedWebViewProps,
} from '@/utils/bunnyEmbedWebViewProps';

export { BUNNY_EMBED_WEBVIEW_PROPS, buildBunnyEmbedWebViewProps };

export interface BunnyEmbedWebViewProps {
  embedUrl: string | null;
  title?: string;
  style?: object;
  onLoadEnd?: () => void;
  onError?: () => void;
  showLoadingOverlay?: boolean;
  /**
   * @deprecated Prefer interactionMode="watchOnly". Ignored when interactionMode is watchOnly.
   */
  allowNativeFullscreen?: boolean;
  /** Child default: watchOnly (touch blocked, no native FS). */
  interactionMode?: BunnyEmbedInteractionMode;
  /** URL query preset. Default watchOnly. */
  playbackPreset?: BunnyEmbedPlaybackPreset;
}

export function BunnyEmbedWebView({
  embedUrl,
  title = 'Video',
  style,
  onLoadEnd,
  onError,
  showLoadingOverlay = true,
  allowNativeFullscreen = false,
  interactionMode = 'watchOnly',
  playbackPreset = 'watchOnly',
}: BunnyEmbedWebViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [webLoading, setWebLoading] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [playWallReady, setPlayWallReady] = useState(false);

  const blockTouch = shouldBlockBunnyTouch(interactionMode);
  const keepMuted = playbackPreset === 'backgroundLoop';
  const allowPause = playbackPreset !== 'backgroundLoop';
  const togglePlaybackScript = useMemo(
    () => buildBunnyEmbedTogglePlaybackScript({ keepMuted, allowPause }),
    [keepMuted, allowPause]
  );
  const playWallInstallerScript = useMemo(
    () => buildBunnyEmbedPlayWallInstallerScript({ keepMuted, allowPause }),
    [keepMuted, allowPause]
  );

  /**
   * iOS: uncover WKWebView as soon as load finishes. A native overlay both
   * steals the user gesture and can pause inline video. Android waits until
   * the in-page wall is installed. CMS background stays covered.
   */
  const passTouchesToInPageWall = shouldUncoverBunnyWebViewForGestures({
    blockTouch,
    allowPause,
    playWallReady,
    isLoading: webLoading,
    hasError: Boolean(playbackError),
    platformOs: Platform.OS,
  });

  const webViewProps = useMemo(
    () => buildBunnyEmbedWebViewProps(interactionMode, allowNativeFullscreen),
    [interactionMode, allowNativeFullscreen]
  );

  const validEmbed = useMemo(
    () => (embedUrl && looksLikeBunnyExploreEmbedUrl(embedUrl) ? embedUrl.trim() : null),
    [embedUrl]
  );

  const webViewSource = useMemo(
    () =>
      validEmbed
        ? {
            uri: buildBunnyEmbedWebViewUrl(validEmbed, { preset: playbackPreset }),
            headers: {
              Referer: BUNNY_EMBED_REFERER,
              referer: BUNNY_EMBED_REFERER,
            },
          }
        : null,
    [validEmbed, playbackPreset, reloadToken]
  );

  useEffect(() => {
    setWebLoading(true);
    setPlaybackError(null);
    setPlayWallReady(false);
  }, [validEmbed, playbackPreset, reloadToken]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void ensureCmsPlaybackAudioMode();
  }, []);

  useEffect(() => {
    if (!webLoading || playbackError) return;
    const timer = setTimeout(() => {
      setWebLoading(false);
    }, BUNNY_EMBED_LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [webLoading, playbackError, reloadToken]);

  useEffect(() => {
    if (!blockTouch || webLoading || playbackError) return;
    const delays =
      Platform.OS === 'ios' ? BUNNY_EMBED_IOS_INSTALLER_RETRY_MS : ([] as const);
    const timers = delays.map((ms) =>
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(playWallInstallerScript);
      }, ms)
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [blockTouch, webLoading, playbackError, playWallInstallerScript, reloadToken]);

  const injectTogglePlayback = useCallback(() => {
    webViewRef.current?.injectJavaScript(togglePlaybackScript);
  }, [togglePlaybackScript]);

  const handleWallPress = useCallback(() => {
    injectTogglePlayback();
  }, [injectTogglePlayback]);

  const handleWebViewMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    if (isBunnyEmbedPlayWallReadyMessage(event.nativeEvent.data)) {
      setPlayWallReady(true);
    }
  }, []);

  const handleLoadEnd = useCallback(() => {
    setWebLoading(false);
    webViewRef.current?.injectJavaScript(playWallInstallerScript);
    onLoadEnd?.();
  }, [onLoadEnd, playWallInstallerScript]);

  const reportError = useCallback(
    (message?: string) => {
      setPlaybackError(
        message ?? 'The video could not load. Check your connection and try again.'
      );
      setWebLoading(false);
      onError?.();
    },
    [onError]
  );

  const handleError = useCallback(() => {
    reportError();
  }, [reportError]);

  const handleHttpError = useCallback(
    (event: { nativeEvent: { statusCode?: number; url?: string } }) => {
      if (
        isFatalBunnyEmbedHttpError(
          event.nativeEvent.url,
          event.nativeEvent.statusCode,
          validEmbed
        )
      ) {
        reportError('The video could not load (network error). Check your connection and try again.');
      }
    },
    [reportError, validEmbed]
  );

  const handleRenderProcessGone = useCallback(() => {
    reportError('Playback stopped unexpectedly. Tap Try again.');
  }, [reportError]);

  const handleRetry = useCallback(() => {
    setPlaybackError(null);
    setWebLoading(true);
    setReloadToken((n) => n + 1);
  }, []);

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
        ref={webViewRef}
        key={`bunny-embed-${reloadToken}`}
        {...webViewProps}
        source={webViewSource}
        style={styles.webView}
        injectedJavaScript={blockTouch ? playWallInstallerScript : undefined}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={handleWebViewMessage}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleHttpError}
        onRenderProcessGone={handleRenderProcessGone}
        accessibilityLabel={`Bunny embed playback for ${title}`}
        accessibilityElementsHidden={blockTouch}
        importantForAccessibility={blockTouch ? 'no-hide-descendants' : 'auto'}
      />
      {blockTouch && !passTouchesToInPageWall ? (
        <Pressable
          style={styles.touchBlocker}
          pointerEvents="auto"
          onPressIn={handleWallPress}
          onPress={handleWallPress}
          accessible
          accessibilityRole="button"
          accessibilityLabel={allowPause ? `Play or pause ${title}` : `Play ${title}`}
        />
      ) : null}
      {playbackError ? (
        <View style={styles.errorBanner}>
          <ThemedText style={styles.errorText}>{playbackError}</ThemedText>
          <Pressable
            onPress={handleRetry}
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <ThemedText style={styles.retryBtnText}>Try again</ThemedText>
          </Pressable>
        </View>
      ) : null}
      {showLoadingOverlay && webLoading && !playbackError ? (
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
  touchBlocker: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: 10,
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
    zIndex: 20,
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    gap: spacing[3],
    zIndex: 30,
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radii.lg,
    backgroundColor: colors.secondary,
  },
  retryBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
});
