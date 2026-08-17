/**
 * Looping muted background video for CMS demo / reward pages.
 * Uploaded MP4/file assets use expo-av (Star Cam parity), with HTML5 WebView fallback
 * when the device hardware decoder rejects the file (e.g. 4K H.264). Bunny embeds use WebView.
 */

import { ResizeMode, Video, type AVPlaybackStatus } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '@/config/theme/colors';
import { isHardwareDecoderPlaybackFailure } from '@/utils/cmsVideoPlayback';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

import { BunnyEmbedWebView } from './bunny-embed-webview';
import {
  CMS_INLINE_WEBVIEW_PROPS,
  resolveCmsInlineWebViewLocalAccess,
} from './cms-inline-webview-props';
import { isLocalMediaUri } from './cms-player-media';
import { resolveCmsAbsoluteMediaUrl } from './cms-player-shared';
import {
  buildLoopingVideoHtml,
  CMS_LOOPING_VIDEO_ENDED_MESSAGE,
  CMS_LOOPING_VIDEO_ERROR_PREFIX,
  CMS_LOOPING_VIDEO_READY_MESSAGE,
} from './cms-looping-video-html';
import {
  CmsVideoPlaybackDebugPanel,
  probeLocalMediaFile,
  shouldShowCmsVideoDebugPanel,
  type CmsVideoPlaybackDebugContext,
} from './cms-video-playback-debug';

const FADE_MS = 220;
const STUCK_LOADING_MS = 8000;

export interface CmsVideoPlaybackDebugMeta {
  scene?: string;
  pageId?: string;
  pageType?: string;
  bookId?: string | null;
  pageVideoUrl?: string | null;
  uriMapRemote?: string | null;
  uriMapResolved?: string | null;
}

export interface CmsLoopingVideoPlaybackEvent {
  positionSec: number;
  durationSec: number | null;
  didJustFinish: boolean;
  canDetectEnded: boolean;
  failed: boolean;
}

export interface CmsLoopingBackgroundVideoProps {
  uri: string | null | undefined;
  /** Remote https URL used when local file playback fails. */
  remoteUri?: string | null;
  accessibilityLabel?: string;
  debug?: CmsVideoPlaybackDebugMeta;
  onPlaybackEvent?: (event: CmsLoopingVideoPlaybackEvent) => void;
}

function resolvePlaybackCandidates(
  uri: string | null | undefined,
  remoteUri?: string | null
): { primary: string; remote: string | null; local: string | null } {
  const primary = resolveCmsAbsoluteMediaUrl(uri);
  const remote =
    resolveCmsAbsoluteMediaUrl(remoteUri) ||
    (primary && /^https?:\/\//i.test(primary) ? primary : null);
  const local =
    primary && isLocalMediaUri(primary)
      ? primary
      : remoteUri && isLocalMediaUri(remoteUri)
        ? resolveCmsAbsoluteMediaUrl(remoteUri)
        : null;

  return { primary: primary || '', remote, local };
}

function CmsHtml5LoopingVideoWebView({
  candidates,
  accessibilityLabel,
  debugMeta,
  onDebugChange,
  priorError,
  onPlaybackEvent,
}: {
  candidates: string[];
  accessibilityLabel: string;
  debugMeta?: CmsVideoPlaybackDebugMeta;
  onDebugChange: (patch: Partial<CmsVideoPlaybackDebugContext>) => void;
  priorError?: string | null;
  onPlaybackEvent?: (event: CmsLoopingVideoPlaybackEvent) => void;
}) {
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [stuckLoading, setStuckLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(priorError ?? null);
  const opacity = useRef(new Animated.Value(0)).current;
  const playbackUri = candidates[candidateIndex] ?? null;

  const webViewSource = useMemo(() => {
    if (!playbackUri) return null;
    const html = buildLoopingVideoHtml(playbackUri);
    const localAccess = resolveCmsInlineWebViewLocalAccess(playbackUri);
    return { html, ...localAccess };
  }, [playbackUri]);

  useEffect(() => {
    setCandidateIndex(0);
    setReady(false);
    setFailed(false);
    setStuckLoading(false);
    setLastError(priorError ?? null);
    opacity.setValue(0);
  }, [candidates, priorError, opacity]);

  useEffect(() => {
    if (!ready) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [ready, opacity]);

  useEffect(() => {
    if (ready || failed || !playbackUri) return;
    const timer = setTimeout(() => {
      setStuckLoading(true);
      setLastError((prev) => prev ?? 'Timed out waiting for HTML5 video ready (8s)');
    }, STUCK_LOADING_MS);
    return () => clearTimeout(timer);
  }, [ready, failed, playbackUri, candidateIndex]);

  const localUri = useMemo(
    () => candidates.find((uri) => isLocalMediaUri(uri)) ?? null,
    [candidates]
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const probeUri = localUri ?? debugMeta?.uriMapResolved ?? null;
      const probe = await probeLocalMediaFile(probeUri);
      if (cancelled) return;
      onDebugChange({
        ...debugMeta,
        localUri: localUri ?? debugMeta?.uriMapResolved ?? null,
        remoteUri: candidates.find((uri) => /^https?:\/\//i.test(uri)) ?? null,
        playbackUriProp: playbackUri,
        activeSource: playbackUri,
        candidates,
        candidateIndex,
        playbackEngine: 'webview',
        isBunnyEmbed: false,
        ready,
        failed,
        stuckLoading,
        lastError,
        localFileExists: probe.exists,
        localFileSize: probe.size,
        extraLines: probe.error ? [`localFileProbeError: ${probe.error}`] : [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [
    localUri,
    debugMeta,
    playbackUri,
    candidates,
    candidateIndex,
    ready,
    failed,
    stuckLoading,
    lastError,
    onDebugChange,
  ]);

  const handleReady = useCallback(() => {
    setReady(true);
    setFailed(false);
    setStuckLoading(false);
    setLastError(null);
    onPlaybackEvent?.({
      positionSec: 0,
      durationSec: null,
      didJustFinish: false,
      canDetectEnded: true,
      failed: false,
    });
  }, [onPlaybackEvent]);

  const handlePlaybackError = useCallback(
    (message: string) => {
      setLastError(message);
      if (candidateIndex + 1 < candidates.length) {
        setCandidateIndex((index) => index + 1);
        setReady(false);
        return;
      }
      setFailed(true);
      onPlaybackEvent?.({
        positionSec: 0,
        durationSec: null,
        didJustFinish: false,
        canDetectEnded: true,
        failed: true,
      });
    },
    [candidateIndex, candidates.length, onPlaybackEvent]
  );

  const handleWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const data = event.nativeEvent.data;
      if (data === CMS_LOOPING_VIDEO_READY_MESSAGE) {
        handleReady();
        return;
      }
      if (data === CMS_LOOPING_VIDEO_ENDED_MESSAGE) {
        onPlaybackEvent?.({
          positionSec: 0,
          durationSec: null,
          didJustFinish: true,
          canDetectEnded: true,
          failed: false,
        });
        return;
      }
      if (data.startsWith(CMS_LOOPING_VIDEO_ERROR_PREFIX)) {
        const code = data.slice(CMS_LOOPING_VIDEO_ERROR_PREFIX.length) || 'unknown';
        handlePlaybackError(`HTML5 video error (code ${code}, candidate ${candidateIndex + 1}/${candidates.length})`);
      }
    },
    [handleReady, handlePlaybackError, candidateIndex, candidates.length, onPlaybackEvent]
  );

  const showDebug = shouldShowCmsVideoDebugPanel({ failed, stuckLoading });

  if (!playbackUri || !webViewSource) {
    return (
      <CmsVideoPlaybackDebugPanel
        visible={showDebug}
        context={{
          ...debugMeta,
          playbackEngine: 'webview',
          failed: true,
          lastError: lastError ?? 'No WebView playback URI candidates',
          candidates,
        }}
      />
    );
  }

  return (
    <>
      {!failed ? (
        <Animated.View style={[styles.videoLayer, { opacity: ready ? opacity : 0 }]}>
          <WebView
            key={playbackUri}
            source={webViewSource}
            style={StyleSheet.absoluteFillObject}
            {...CMS_INLINE_WEBVIEW_PROPS}
            onMessage={handleWebViewMessage}
            onError={() => {
              handlePlaybackError(`WebView onError (candidate ${candidateIndex + 1}/${candidates.length})`);
            }}
            onHttpError={() => {
              handlePlaybackError(`WebView onHttpError (candidate ${candidateIndex + 1}/${candidates.length})`);
            }}
            accessibilityLabel={accessibilityLabel}
          />
          {!ready ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color={colors.secondary} />
            </View>
          ) : null}
        </Animated.View>
      ) : null}
      <CmsVideoPlaybackDebugPanel
        visible={showDebug}
        context={{
          ...debugMeta,
          localUri,
          playbackUriProp: playbackUri,
          activeSource: playbackUri,
          candidates,
          candidateIndex,
          playbackEngine: 'webview',
          isBunnyEmbed: false,
          ready,
          failed,
          stuckLoading,
          lastError,
        }}
      />
    </>
  );
}

function CmsNativeLoopingVideo({
  localUri,
  remoteUri,
  accessibilityLabel,
  debugMeta,
  onDebugChange,
  onPlaybackEvent,
}: {
  localUri: string | null;
  remoteUri: string | null;
  accessibilityLabel: string;
  debugMeta?: CmsVideoPlaybackDebugMeta;
  onDebugChange: (patch: Partial<CmsVideoPlaybackDebugContext>) => void;
  onPlaybackEvent?: (event: CmsLoopingVideoPlaybackEvent) => void;
}) {
  const candidates = useMemo(() => {
    const list: string[] = [];
    if (localUri) list.push(localUri);
    if (remoteUri && remoteUri !== localUri) list.push(remoteUri);
    return list;
  }, [localUri, remoteUri]);

  const [playbackEngine, setPlaybackEngine] = useState<'expo-av' | 'webview'>('expo-av');
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [stuckLoading, setStuckLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [webViewPriorError, setWebViewPriorError] = useState<string | null>(null);
  const [allowLoop, setAllowLoop] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const videoRef = useRef<Video>(null);
  const endedOnceRef = useRef(false);
  const playbackUri = candidates[candidateIndex] ?? null;

  useEffect(() => {
    setPlaybackEngine('expo-av');
    setCandidateIndex(0);
    setReady(false);
    setFailed(false);
    setStuckLoading(false);
    setLastError(null);
    setWebViewPriorError(null);
    setAllowLoop(false);
    endedOnceRef.current = false;
    opacity.setValue(0);
  }, [localUri, remoteUri, opacity]);

  useEffect(() => {
    if (playbackEngine !== 'expo-av' || !ready) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [ready, opacity, playbackEngine]);

  useEffect(() => {
    if (playbackEngine !== 'expo-av' || ready || failed || !playbackUri) return;
    const timer = setTimeout(() => {
      setStuckLoading(true);
      setLastError((prev) => prev ?? 'Timed out waiting for video onLoad (8s)');
    }, STUCK_LOADING_MS);
    return () => clearTimeout(timer);
  }, [playbackEngine, ready, failed, playbackUri, candidateIndex]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const probeUri = localUri ?? debugMeta?.uriMapResolved ?? null;
      const probe = await probeLocalMediaFile(probeUri);
      if (cancelled) return;
      onDebugChange({
        ...debugMeta,
        localUri: localUri ?? debugMeta?.uriMapResolved ?? null,
        remoteUri,
        playbackUriProp: playbackUri,
        activeSource: playbackUri,
        candidates,
        candidateIndex,
        playbackEngine,
        isBunnyEmbed: false,
        ready,
        failed,
        stuckLoading,
        lastError,
        localFileExists: probe.exists,
        localFileSize: probe.size,
        extraLines: probe.error ? [`localFileProbeError: ${probe.error}`] : [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [
    localUri,
    remoteUri,
    playbackUri,
    candidates,
    candidateIndex,
    playbackEngine,
    ready,
    failed,
    stuckLoading,
    lastError,
    debugMeta,
    onDebugChange,
  ]);

  const switchToWebViewFallback = useCallback((message: string) => {
    setWebViewPriorError(message);
    setPlaybackEngine('webview');
    setReady(false);
    setFailed(false);
    setStuckLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setReady(true);
    setFailed(false);
    setStuckLoading(false);
    setLastError(null);
  }, []);

  const handleError = useCallback(
    (error?: string) => {
      const message = error || `expo-av onError (candidate ${candidateIndex + 1}/${candidates.length})`;
      setLastError(message);

      if (isHardwareDecoderPlaybackFailure(message)) {
        switchToWebViewFallback(`${message} → HTML5 WebView fallback`);
        return;
      }

      if (candidateIndex + 1 < candidates.length) {
        setCandidateIndex((index) => index + 1);
        setReady(false);
        return;
      }

      switchToWebViewFallback(`${message} → HTML5 WebView fallback`);
    },
    [candidateIndex, candidates.length, switchToWebViewFallback]
  );

  const handleStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      const positionSec = (status.positionMillis ?? 0) / 1000;
      const durationSec =
        status.durationMillis != null && status.durationMillis > 0
          ? status.durationMillis / 1000
          : null;
      const didJustFinish = Boolean(status.didJustFinish);
      onPlaybackEvent?.({
        positionSec,
        durationSec,
        didJustFinish,
        canDetectEnded: true,
        failed: false,
      });
      if (didJustFinish && !endedOnceRef.current) {
        endedOnceRef.current = true;
        setAllowLoop(true);
        void videoRef.current?.setIsLoopingAsync(true).catch(() => undefined);
        void videoRef.current?.replayAsync().catch(() => undefined);
      }
    },
    [onPlaybackEvent]
  );

  const showDebug = shouldShowCmsVideoDebugPanel({ failed, stuckLoading });

  if (playbackEngine === 'webview') {
    return (
      <CmsHtml5LoopingVideoWebView
        candidates={candidates}
        accessibilityLabel={accessibilityLabel}
        debugMeta={debugMeta}
        onDebugChange={onDebugChange}
        priorError={webViewPriorError}
        onPlaybackEvent={onPlaybackEvent}
      />
    );
  }

  if (!playbackUri) {
    return (
      <CmsVideoPlaybackDebugPanel
        visible={showDebug}
        context={{
          ...debugMeta,
          localUri,
          remoteUri,
          failed: true,
          lastError: lastError ?? 'No playback URI candidates',
          candidates,
        }}
      />
    );
  }

  return (
    <>
      {!failed ? (
        <Animated.View style={[styles.videoLayer, { opacity: ready ? opacity : 0 }]}>
          <Video
            ref={videoRef}
            key={playbackUri}
            source={{ uri: playbackUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isMuted
            isLooping={allowLoop}
            useNativeControls={false}
            progressUpdateIntervalMillis={Platform.OS === 'android' ? 500 : 250}
            onLoad={handleLoad}
            onError={handleError}
            onPlaybackStatusUpdate={handleStatus}
            accessibilityLabel={accessibilityLabel}
          />
          {!ready ? (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color={colors.secondary} />
            </View>
          ) : null}
        </Animated.View>
      ) : null}
      <CmsVideoPlaybackDebugPanel
        visible={showDebug}
        context={{
          ...debugMeta,
          localUri,
          remoteUri,
          playbackUriProp: playbackUri,
          activeSource: playbackUri,
          candidates,
          candidateIndex,
          playbackEngine: 'expo-av',
          isBunnyEmbed: false,
          ready,
          failed,
          stuckLoading,
          lastError,
        }}
      />
    </>
  );
}

export function CmsLoopingBackgroundVideo({
  uri,
  remoteUri,
  accessibilityLabel = 'Tutorial video',
  debug,
  onPlaybackEvent,
}: CmsLoopingBackgroundVideoProps) {
  const playbackUri = resolveCmsAbsoluteMediaUrl(uri);
  const isBunnyEmbed = looksLikeBunnyExploreEmbedUrl(playbackUri);
  const [bunnyReady, setBunnyReady] = useState(false);
  const [bunnyFailed, setBunnyFailed] = useState(false);
  const [bunnyError, setBunnyError] = useState<string | null>(null);
  const [debugContext, setDebugContext] = useState<CmsVideoPlaybackDebugContext>({});
  const bunnyOpacity = useRef(new Animated.Value(0)).current;

  const { local, remote } = useMemo(
    () => resolvePlaybackCandidates(uri, remoteUri ?? uri),
    [uri, remoteUri]
  );

  const mergeDebug = useCallback((patch: Partial<CmsVideoPlaybackDebugContext>) => {
    setDebugContext((prev) => ({ ...prev, ...debug, ...patch }));
  }, [debug]);

  useEffect(() => {
    setBunnyReady(false);
    setBunnyFailed(false);
    setBunnyError(null);
    bunnyOpacity.setValue(0);
    mergeDebug({
      playbackUriProp: playbackUri,
      remoteUri: remote,
      localUri: local,
      isBunnyEmbed,
      pageVideoUrl: debug?.pageVideoUrl,
      uriMapRemote: debug?.uriMapRemote,
      uriMapResolved: debug?.uriMapResolved,
    });
  }, [playbackUri, remote, local, isBunnyEmbed, debug, mergeDebug, bunnyOpacity]);

  useEffect(() => {
    if (!bunnyReady) return;
    Animated.timing(bunnyOpacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [bunnyReady, bunnyOpacity]);

  const showDebug = shouldShowCmsVideoDebugPanel({
    failed: bunnyFailed || debugContext.failed,
    stuckLoading: debugContext.stuckLoading,
  });

  if (!playbackUri && !remoteUri) {
    return (
      <CmsVideoPlaybackDebugPanel
        visible={shouldShowCmsVideoDebugPanel({ failed: true })}
        context={{
          ...debug,
          failed: true,
          lastError: 'No video URL resolved for this page',
          pageVideoUrl: debug?.pageVideoUrl,
        }}
      />
    );
  }

  if (isBunnyEmbed) {
    return (
      <>
        <Animated.View style={[styles.videoLayer, { opacity: bunnyReady ? bunnyOpacity : 0 }]}>
          <BunnyEmbedWebView
            embedUrl={playbackUri}
            interactionMode="watchOnly"
            playbackPreset="backgroundLoop"
            allowNativeFullscreen={false}
            showLoadingOverlay={false}
            style={styles.transparentFill}
            onLoadEnd={() => {
              setBunnyReady(true);
              mergeDebug({ ready: true, activeSource: playbackUri, lastError: null });
              onPlaybackEvent?.({
                positionSec: 0,
                durationSec: null,
                didJustFinish: false,
                canDetectEnded: false,
                failed: false,
              });
            }}
            onError={() => {
              setBunnyFailed(true);
              setBunnyError('Bunny WebView onError');
              mergeDebug({ failed: true, lastError: 'Bunny WebView onError' });
              onPlaybackEvent?.({
                positionSec: 0,
                durationSec: null,
                didJustFinish: false,
                canDetectEnded: false,
                failed: true,
              });
            }}
          />
        </Animated.View>
        <CmsVideoPlaybackDebugPanel
          visible={showDebug}
          context={{
            ...debug,
            ...debugContext,
            isBunnyEmbed: true,
            playbackUriProp: playbackUri,
            activeSource: playbackUri,
            ready: bunnyReady,
            failed: bunnyFailed,
            lastError: bunnyError,
          }}
        />
      </>
    );
  }

  return (
    <CmsNativeLoopingVideo
      localUri={local}
      remoteUri={remote}
      accessibilityLabel={accessibilityLabel}
      debugMeta={debug}
      onDebugChange={mergeDebug}
      onPlaybackEvent={onPlaybackEvent}
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
