/**
 * Looping muted background video for CMS demo / reward pages.
 * Uses WebView + HTML5 `<video>` (same as web cmsTest) so overlays composited correctly on Android.
 * Bunny Stream embed URLs use the dedicated Bunny WebView player.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

import { BunnyEmbedWebView } from './bunny-embed-webview';
import { CMS_INLINE_WEBVIEW_PROPS } from './cms-inline-webview-props';
import { resolveCmsAbsoluteMediaUrl } from './cms-player-shared';

export interface CmsLoopingBackgroundVideoProps {
  uri: string | null | undefined;
  accessibilityLabel?: string;
}

/** Inline HTML5 player — parity with web DemoTest `<video autoPlay muted loop playsInline />`. */
function buildLoopingVideoHtml(videoUrl: string): string {
  const src = JSON.stringify(videoUrl);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
  video { position: fixed; inset: 0; width: 100%; height: 100%; object-fit: cover; background: #000; }
</style>
</head>
<body>
  <video id="cms-bg-video" muted loop playsinline webkit-playsinline autoplay aria-label="Tutorial video"></video>
  <script>
    (function () {
      var video = document.getElementById('cms-bg-video');
      if (!video) return;
      video.src = ${src};
      var play = function () {
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      };
      video.addEventListener('loadeddata', play);
      play();
    })();
  </script>
</body>
</html>`;
}

function CmsHtml5BackgroundVideoWebView({
  uri,
  accessibilityLabel,
}: {
  uri: string;
  accessibilityLabel: string;
}) {
  const html = useMemo(() => buildLoopingVideoHtml(uri), [uri]);
  const baseUrl = useMemo(() => {
    try {
      return new URL(uri).origin;
    } catch {
      return undefined;
    }
  }, [uri]);

  return (
    <WebView
      {...CMS_INLINE_WEBVIEW_PROPS}
      source={{ html, baseUrl }}
      style={StyleSheet.absoluteFillObject}
      scrollEnabled={false}
      accessibilityLabel={accessibilityLabel}
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
  accessibilityLabel = 'Tutorial video',
}: CmsLoopingBackgroundVideoProps) {
  const playbackUri = resolveCmsAbsoluteMediaUrl(uri);
  const isBunnyEmbed = looksLikeBunnyExploreEmbedUrl(playbackUri);

  if (!playbackUri) return null;

  if (isBunnyEmbed) {
    return (
      <View style={styles.videoLayer} accessibilityLabel={accessibilityLabel}>
        <BunnyEmbedWebView
          embedUrl={playbackUri}
          allowNativeFullscreen={false}
          showLoadingOverlay={false}
        />
      </View>
    );
  }

  return (
    <View style={styles.videoLayer} accessibilityLabel={accessibilityLabel}>
      <CmsHtml5BackgroundVideoWebView uri={playbackUri} accessibilityLabel={accessibilityLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: '#000',
  },
});
