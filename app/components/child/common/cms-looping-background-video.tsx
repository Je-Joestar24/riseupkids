/**
 * Looping muted background video for CMS demo / reward pages.
 * Uses WebView + HTML5 `<video>` (same as web cmsTest) so overlays composited correctly on Android.
 * Bunny Stream embed URLs use the dedicated Bunny WebView player.
 *
 * Background image stays visible (poster + hidden layer) until the first video frame is ready.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

import { BunnyEmbedWebView } from './bunny-embed-webview';
import { CMS_INLINE_WEBVIEW_PROPS } from './cms-inline-webview-props';
import {
  buildLoopingVideoHtml,
  CMS_LOOPING_VIDEO_READY_MESSAGE,
} from './cms-looping-video-html';
import { resolveCmsAbsoluteMediaUrl } from './cms-player-shared';

const FADE_MS = 280;

export interface CmsLoopingBackgroundVideoProps {
  uri: string | null | undefined;
  /** Optional still shown under / as poster until video frames are ready. */
  posterUri?: string | null;
  accessibilityLabel?: string;
}

function CmsHtml5BackgroundVideoWebView({
  uri,
  posterUri,
  accessibilityLabel,
  onReady,
}: {
  uri: string;
  posterUri?: string | null;
  accessibilityLabel: string;
  onReady: () => void;
}) {
  const html = useMemo(() => buildLoopingVideoHtml(uri, posterUri), [uri, posterUri]);
  const baseUrl = useMemo(() => {
    if (uri.startsWith('file://')) {
      const slash = uri.lastIndexOf('/');
      return slash > 0 ? uri.slice(0, slash + 1) : undefined;
    }
    try {
      return new URL(uri).origin;
    } catch {
      return undefined;
    }
  }, [uri]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (event.nativeEvent.data === CMS_LOOPING_VIDEO_READY_MESSAGE) {
      onReady();
    }
  };

  return (
    <WebView
      {...CMS_INLINE_WEBVIEW_PROPS}
      source={{ html, baseUrl }}
      style={[StyleSheet.absoluteFillObject, styles.transparentWebView]}
      scrollEnabled={false}
      accessibilityLabel={accessibilityLabel}
      onMessage={handleMessage}
      onError={() => {
        if (__DEV__) {
          console.warn('[CmsLoopingBackgroundVideo] WebView failed to load', uri);
        }
      }}
    />
  );
}

export function CmsLoopingBackgroundVideo({
  uri,
  posterUri,
  accessibilityLabel = 'Tutorial video',
}: CmsLoopingBackgroundVideoProps) {
  const playbackUri = resolveCmsAbsoluteMediaUrl(uri);
  const resolvedPoster = resolveCmsAbsoluteMediaUrl(posterUri);
  const isBunnyEmbed = looksLikeBunnyExploreEmbedUrl(playbackUri);
  const [ready, setReady] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setReady(false);
    opacity.setValue(0);
  }, [playbackUri, opacity]);

  useEffect(() => {
    if (!ready) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [ready, opacity]);

  const markReady = () => setReady(true);

  if (!playbackUri) return null;

  if (isBunnyEmbed) {
    return (
      <Animated.View style={[styles.videoLayer, { opacity }]} accessibilityLabel={accessibilityLabel}>
        <BunnyEmbedWebView
          embedUrl={playbackUri}
          allowNativeFullscreen={false}
          showLoadingOverlay={false}
          style={styles.transparentFill}
          onLoadEnd={markReady}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.videoLayer, { opacity }]} accessibilityLabel={accessibilityLabel}>
      <CmsHtml5BackgroundVideoWebView
        uri={playbackUri}
        posterUri={resolvedPoster || undefined}
        accessibilityLabel={accessibilityLabel}
        onReady={markReady}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  transparentWebView: {
    backgroundColor: 'transparent',
  },
  transparentFill: {
    backgroundColor: 'transparent',
  },
});
