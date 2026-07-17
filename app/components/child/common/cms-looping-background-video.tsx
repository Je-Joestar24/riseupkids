/**
 * Looping muted background video for CMS demo / reward pages.
 * Uploaded MP4/file assets use expo-av (Star Cam parity). Bunny embeds use WebView.
 */

import { ResizeMode, Video } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet, View } from 'react-native';

import { colors } from '@/config/theme/colors';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

import { BunnyEmbedWebView } from './bunny-embed-webview';
import { isLocalMediaUri } from './cms-player-media';
import { resolveCmsAbsoluteMediaUrl } from './cms-player-shared';

const FADE_MS = 220;

export interface CmsLoopingBackgroundVideoProps {
  uri: string | null | undefined;
  /** Remote https URL used when local file playback fails. */
  remoteUri?: string | null;
  accessibilityLabel?: string;
}

function resolvePlaybackCandidates(
  uri: string | null | undefined,
  remoteUri?: string | null
): { primary: string; remote: string | null; local: string | null } {
  const primary = resolveCmsAbsoluteMediaUrl(uri);
  const remote = resolveCmsAbsoluteMediaUrl(remoteUri) || (primary && /^https?:\/\//i.test(primary) ? primary : null);
  const local =
    primary && isLocalMediaUri(primary)
      ? primary
      : remoteUri && isLocalMediaUri(remoteUri)
        ? resolveCmsAbsoluteMediaUrl(remoteUri)
        : null;

  return { primary: primary || '', remote, local };
}

function CmsNativeLoopingVideo({
  localUri,
  remoteUri,
  accessibilityLabel,
}: {
  localUri: string | null;
  remoteUri: string | null;
  accessibilityLabel: string;
}) {
  const candidates = useMemo(() => {
    const list: string[] = [];
    if (localUri) list.push(localUri);
    if (remoteUri && remoteUri !== localUri) list.push(remoteUri);
    return list;
  }, [localUri, remoteUri]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const playbackUri = candidates[candidateIndex] ?? null;

  useEffect(() => {
    setCandidateIndex(0);
    setReady(false);
    setFailed(false);
    opacity.setValue(0);
  }, [localUri, remoteUri, opacity]);

  useEffect(() => {
    if (!ready) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [ready, opacity]);

  const handleLoad = useCallback(() => {
    setReady(true);
    setFailed(false);
  }, []);

  const handleError = useCallback(() => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((index) => index + 1);
      setReady(false);
      return;
    }
    setFailed(true);
    if (__DEV__) {
      console.warn('[CmsLoopingBackgroundVideo] expo-av failed for all sources', candidates);
    }
  }, [candidateIndex, candidates]);

  if (!playbackUri || failed) return null;

  return (
    <Animated.View style={[styles.videoLayer, { opacity: ready ? opacity : 0 }]}>
      <Video
        key={playbackUri}
        source={{ uri: playbackUri }}
        style={StyleSheet.absoluteFillObject}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isMuted
        isLooping
        useNativeControls={false}
        progressUpdateIntervalMillis={Platform.OS === 'android' ? 500 : 250}
        onLoad={handleLoad}
        onError={handleError}
        accessibilityLabel={accessibilityLabel}
      />
      {!ready ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.secondary} />
        </View>
      ) : null}
    </Animated.View>
  );
}

export function CmsLoopingBackgroundVideo({
  uri,
  remoteUri,
  accessibilityLabel = 'Tutorial video',
}: CmsLoopingBackgroundVideoProps) {
  const playbackUri = resolveCmsAbsoluteMediaUrl(uri);
  const isBunnyEmbed = looksLikeBunnyExploreEmbedUrl(playbackUri);
  const [bunnyReady, setBunnyReady] = useState(false);
  const bunnyOpacity = useRef(new Animated.Value(0)).current;

  const { local, remote } = useMemo(
    () => resolvePlaybackCandidates(uri, remoteUri ?? uri),
    [uri, remoteUri]
  );

  useEffect(() => {
    setBunnyReady(false);
    bunnyOpacity.setValue(0);
  }, [playbackUri, bunnyOpacity]);

  useEffect(() => {
    if (!bunnyReady) return;
    Animated.timing(bunnyOpacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [bunnyReady, bunnyOpacity]);

  if (!playbackUri) return null;

  if (isBunnyEmbed) {
    return (
      <Animated.View style={[styles.videoLayer, { opacity: bunnyReady ? bunnyOpacity : 0 }]}>
        <BunnyEmbedWebView
          embedUrl={playbackUri}
          allowNativeFullscreen={false}
          showLoadingOverlay={false}
          style={styles.transparentFill}
          onLoadEnd={() => setBunnyReady(true)}
        />
      </Animated.View>
    );
  }

  return (
    <CmsNativeLoopingVideo
      localUri={local}
      remoteUri={remote}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  transparentFill: {
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
