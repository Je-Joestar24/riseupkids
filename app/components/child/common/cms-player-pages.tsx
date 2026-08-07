/**
 * CMS player page bodies (intro / demo / content) — layout parity with web cmsTest components.
 * Parent must be a 16:9 stage; buttons use % of parent like web.
 */


import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Quicksand } from '@/constants/theme';
import { colors } from '@/config/theme/colors';
import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';
import {
  startCmsIntroBackgroundMusic,
  stopCmsIntroBackgroundMusic,
} from '@/services/cmsIntroBackgroundMusic';
import { shouldStartCmsIntroBackgroundMusic } from '@/utils/cmsPlaybackAudio';

import { resolvePlayableMediaUri } from './cms-player-media';
import { useCmsMediaUriMap, useCmsPlayableMediaUri } from './cms-player-media-context';
import { CmsLoopingBackgroundVideo } from './cms-looping-background-video';
import {
  CMS_READING_LINE_ERASE_MS,
  cmsLocalUiAssets,
  extractReadingWordsFromPage,
  getActiveReadingWordIndexInLine,
  groupReadingWordsByLine,
  normalizeReadingText,
  resolveAudioUrl,
  resolveContentReadingFontSizePx,
  resolveCmsAbsoluteMediaUrl,
  resolveCmsContentDisplayLineIndex,
  resolveImageUrl,
  resolveIntroBackgroundMusicUrl,
  resolveVideoUrl,
  scaleCmsReadingFontSizePx,
} from './cms-player-shared';
import {
  CMS_CONTENT_AUDIO_SAFETY_UNLOCK_MS,
  resolveCmsContentAudioDurationSec,
  shouldSafetyUnlockCmsContentAudio,
  shouldUnlockCmsContentNextFromAudio,
} from '@/utils/cmsContentAudioNextUnlock';
import {
  takePrimedCmsContentAudio,
} from '@/services/cmsContentAudioPrime';
import { ensurePlayableCmsAudioUri } from '@/utils/cmsMediaFileExtension';
import {
  getCmsContentAudioSettleMs,
  getCmsContentKaraokeLeadMs,
  playCmsSoundWithIosWatchdog,
  prepareCmsContentAudioPlayback,
  shouldShowCmsContentKaraokeLine,
  shouldShowCmsContentReadingFallback,
} from '@/utils/cmsPlaybackAudio';
import {
  CmsContentAudioDebugPanel,
  shouldShowCmsContentAudioDebug,
  type CmsContentAudioDebugContext,
} from './cms-content-audio-debug';

const DOT_COUNT = 14;

function useReadingLineTransition(activeLineIndex: number, resetKey: string) {
  const [displayLineIndex, setDisplayLineIndex] = useState(-1);
  const opacity = useRef(new Animated.Value(0)).current;
  const previousLineRef = useRef(activeLineIndex);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    animRef.current?.stop();
    animRef.current = null;
    setDisplayLineIndex(-1);
    opacity.setValue(0);
    previousLineRef.current = -1;
  }, [resetKey, opacity]);

  useEffect(() => {
    const previousLine = previousLineRef.current;
    if (activeLineIndex === previousLine) return;

    animRef.current?.stop();
    animRef.current = null;

    // Show a new line immediately — short timed lines cannot wait for a long fade-out.
    if (activeLineIndex >= 0) {
      setDisplayLineIndex(activeLineIndex);
      previousLineRef.current = activeLineIndex;
      opacity.setValue(0);
      animRef.current = Animated.timing(opacity, {
        toValue: 1,
        duration: CMS_READING_LINE_ERASE_MS,
        useNativeDriver: true,
      });
      animRef.current.start();
      return;
    }

    // Erase between cutted lines (activeLineIndex === -1).
    animRef.current = Animated.timing(opacity, {
      toValue: 0,
      duration: CMS_READING_LINE_ERASE_MS,
      useNativeDriver: true,
    });
    animRef.current.start(({ finished }) => {
      if (!finished) return;
      setDisplayLineIndex(-1);
      previousLineRef.current = -1;
    });
  }, [activeLineIndex, opacity]);

  return { displayLineIndex, opacity };
}

export function CmsIntroPage({
  page,
  hasNext,
  isPreloading,
  isNextDisabled,
  onNext,
  /** Bumped by modal after landscape + audio mode — restarts BGM on iOS session reset. */
  audioSessionEpoch = 0,
}: {
  page: CmsPlayablePage;
  hasNext: boolean;
  isPreloading: boolean;
  /** When true, Next/Play is locked (initial preload or next-page media not ready). */
  isNextDisabled?: boolean;
  onNext: () => void;
  audioSessionEpoch?: number;
}) {
  const bg = useCmsPlayableMediaUri(resolveImageUrl(page));
  const backgroundMusicUrl = useCmsPlayableMediaUri(resolveIntroBackgroundMusicUrl(page));
  const nextLocked = Boolean(isNextDisabled ?? isPreloading);

  const handleNext = useCallback(() => {
    if (nextLocked || !hasNext) return;
    void stopCmsIntroBackgroundMusic().finally(() => {
      onNext();
    });
  }, [onNext, nextLocked, hasNext]);

  useEffect(() => {
    let cancelled = false;

    if (!shouldStartCmsIntroBackgroundMusic({ backgroundMusicUrl, isPreloading })) {
      void stopCmsIntroBackgroundMusic();
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const ok = await startCmsIntroBackgroundMusic(backgroundMusicUrl);
      if (cancelled && ok) {
        await stopCmsIntroBackgroundMusic();
      }
    })();

    return () => {
      cancelled = true;
      void stopCmsIntroBackgroundMusic();
    };
  }, [page.pageId, backgroundMusicUrl, isPreloading, audioSessionEpoch]);

  return (
    <View style={styles.fill} accessibilityLabel={page.title || 'Intro page'}>
      {bg ? (
        <Image
          source={{ uri: bg }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="contain"
          accessibilityLabel={page.title || 'Intro'}
          accessibilityRole="image"
        />
      ) : null}
      <Pressable
        onPress={handleNext}
        disabled={nextLocked || !hasNext}
        style={({ pressed }) => [
          styles.introPlay,
          (pressed || nextLocked || !hasNext) && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={nextLocked ? 'Next, loading' : 'Play intro and continue'}
        accessibilityState={{ disabled: nextLocked || !hasNext }}
      >
        <Image
          source={cmsLocalUiAssets.introPlayButton}
          style={styles.btnImg}
          resizeMode="contain"
          accessibilityLabel="Play"
        />
      </Pressable>
    </View>
  );
}

export function CmsDemoPage({
  page,
  bookId = null,
  hasNext,
  isPreloading,
  isNextDisabled,
  onNext,
}: {
  page: CmsPlayablePage;
  bookId?: string | null;
  hasNext: boolean;
  isPreloading: boolean;
  isNextDisabled?: boolean;
  onNext: () => void;
}) {
  const mediaUriMap = useCmsMediaUriMap();
  const bgImage = resolvePlayableMediaUri(resolveImageUrl(page), mediaUriMap);
  const pageVideoRaw = resolveVideoUrl(page);
  const remoteVideoUrl = resolveCmsAbsoluteMediaUrl(pageVideoRaw);
  const videoUrl = resolvePlayableMediaUri(pageVideoRaw, mediaUriMap);
  const nextLocked = Boolean(isNextDisabled ?? isPreloading);

  if (__DEV__ && !videoUrl) {
    const media = page.media as { videoMediaId?: string | null; videoMedia?: { url?: string | null } | null };
    console.warn('[CmsDemoPage] No video URL resolved', {
      pageId: page.pageId,
      type: page.type,
      videoMediaId: media?.videoMediaId ?? null,
      videoMediaUrl: media?.videoMedia?.url ?? null,
    });
  }

  return (
    <View style={styles.fill}>
      <View style={styles.demoMediaLayer} pointerEvents="none">
        {bgImage ? (
          <Image
            source={{ uri: bgImage }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="contain"
            accessibilityLabel={page.title || 'Demo'}
            accessibilityRole="image"
          />
        ) : null}
        {videoUrl || remoteVideoUrl ? (
          <CmsLoopingBackgroundVideo
            uri={videoUrl || remoteVideoUrl}
            remoteUri={remoteVideoUrl}
            accessibilityLabel="Demo tutorial video"
            debug={{
              scene: 'demo',
              pageId: page.pageId,
              pageType: page.type,
              bookId,
              pageVideoUrl: pageVideoRaw,
              uriMapRemote: remoteVideoUrl,
              uriMapResolved: remoteVideoUrl ? mediaUriMap[remoteVideoUrl] ?? null : null,
            }}
          />
        ) : null}
      </View>
      {page.subtitle ? (
        <View style={[StyleSheet.absoluteFillObject, styles.demoSubtitleWrap]} pointerEvents="none">
          <Text style={styles.demoSubtitle} accessibilityRole="text">
            {page.subtitle}
          </Text>
        </View>
      ) : null}
      <Pressable
        onPress={onNext}
        disabled={nextLocked || !hasNext}
        style={({ pressed }) => [
          styles.demoPlay,
          (pressed || nextLocked || !hasNext) && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={nextLocked ? 'Next, loading' : 'Play demo and continue to interactive'}
        accessibilityState={{ disabled: nextLocked || !hasNext }}
      >
        <Image
          source={cmsLocalUiAssets.demoPlayButton}
          style={styles.btnImg}
          resizeMode="contain"
          accessibilityLabel="Play demo"
        />
      </Pressable>
    </View>
  );
}

export function CmsContentPage({
  page,
  hasPrev,
  hasNext,
  isPreloading,
  isNextDisabled,
  audioAlreadyHeard = false,
  onAudioHeard,
  onPrev,
  onNext,
  stageWidth = 0,
  stageHeight = 0,
}: {
  page: CmsPlayablePage;
  hasPrev: boolean;
  hasNext: boolean;
  isPreloading: boolean;
  /** Media preload / next-page gate from the modal. */
  isNextDisabled?: boolean;
  /** True when this page’s reading audio was already completed in this book session. */
  audioAlreadyHeard?: boolean;
  onAudioHeard?: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** Current 16:9 stage size — used to scale CMS design-space font presets. */
  stageWidth?: number;
  stageHeight?: number;
}) {
  const bgImage = useCmsPlayableMediaUri(resolveImageUrl(page));
  const remoteAudioUrl = resolveAudioUrl(page);
  const audioUrl = useCmsPlayableMediaUri(remoteAudioUrl);
  const soundRef = useRef<Audio.Sound | null>(null);
  const heardNotifiedRef = useRef(false);
  const playbackProbeRef = useRef({
    positionSec: 0,
    playerDurationSec: null as number | null,
    didJustFinish: false,
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [playerDurationSec, setPlayerDurationSec] = useState<number | null>(null);
  const [didJustFinish, setDidJustFinish] = useState(false);
  const [audioFailedOrSkipped, setAudioFailedOrSkipped] = useState(false);
  /** Karaoke highlight only after audio is loaded and playback has started (sync with word coloring). */
  const [karaokeReady, setKaraokeReady] = useState(false);
  const audioDebugEnabled = shouldShowCmsContentAudioDebug();
  const [audioDebug, setAudioDebug] = useState<CmsContentAudioDebugContext>({
    pageId: page.pageId,
    pageType: 'content',
    engine: 'expo-av',
    phase: 'idle',
  });
  const lastDebugPosLogRef = useRef(0);

  const pushAudioDebug = useCallback(
    (patch: Partial<CmsContentAudioDebugContext>, logLine?: string) => {
      if (!audioDebugEnabled) return;
      setAudioDebug((prev) => {
        const nextLines = logLine
          ? [...(prev.logLines ?? []).slice(-12), `${Date.now() % 100000}:${logLine}`]
          : prev.logLines;
        const next = { ...prev, ...patch, logLines: nextLines };
        if (__DEV__ && logLine) {
          console.log('[CMS AudioDebug]', page.pageId, logLine, patch);
        }
        return next;
      });
    },
    [audioDebugEnabled, page.pageId]
  );

  const readingText = useMemo(
    () =>
      normalizeReadingText(
        page?.reading?.text || (page as { readingText?: string }).readingText || page.subtitle || ''
      ),
    [page]
  );

  const words = useMemo(() => extractReadingWordsFromPage(page), [page]);
  const lineGroups = useMemo(() => groupReadingWordsByLine(words, readingText), [words, readingText]);
  const designReadingFontPx = useMemo(() => resolveContentReadingFontSizePx(page), [page]);
  const readingFontSizePx = useMemo(
    () => scaleCmsReadingFontSizePx(designReadingFontPx, stageWidth, stageHeight),
    [designReadingFontPx, stageWidth, stageHeight]
  );
  const readingTextStyles = useMemo(
    () => ({
      fontSize: readingFontSizePx,
      lineHeight: Math.round(readingFontSizePx * 1.25),
    }),
    [readingFontSizePx]
  );

  const wordTimingFingerprint = useMemo(
    () => words.map((w) => `${w.start}:${w.end}:${w.w}:${w.lineIndex ?? 0}`).join('|'),
    [words]
  );

  const durationSec = useMemo(
    () =>
      resolveCmsContentAudioDurationSec({
        playerDurationSec,
        wordEndSecHints: words.map((w) => w.end),
      }),
    [playerDurationSec, words]
  );

  const audioUnlocked = shouldUnlockCmsContentNextFromAudio({
    hasAudioUrl: Boolean(audioUrl),
    alreadyHeard: audioAlreadyHeard,
    audioFailedOrSkipped,
    positionSec: currentTime,
    durationSec,
    didJustFinish,
  });

  const waitingOnAudio = Boolean(audioUrl) && !audioAlreadyHeard && !audioUnlocked;
  const nextLocked = Boolean(isNextDisabled ?? isPreloading) || waitingOnAudio;

  useEffect(() => {
    heardNotifiedRef.current = false;
  }, [page.pageId]);

  useEffect(() => {
    if (!audioUnlocked || heardNotifiedRef.current) return;
    if (audioAlreadyHeard) return;
    heardNotifiedRef.current = true;
    onAudioHeard?.();
  }, [audioUnlocked, audioAlreadyHeard, onAudioHeard]);

  // Safety: unlock only when audio never starts (stall). Do NOT unlock long narrations at 12s.
  useEffect(() => {
    if (!audioUrl || audioAlreadyHeard || audioUnlocked || audioFailedOrSkipped) return undefined;
    const timer = setTimeout(() => {
      const probe = playbackProbeRef.current;
      if (
        shouldSafetyUnlockCmsContentAudio({
          positionSec: probe.positionSec,
          playerDurationSec: probe.playerDurationSec,
          didJustFinish: probe.didJustFinish,
        })
      ) {
        setAudioFailedOrSkipped(true);
      }
    }, CMS_CONTENT_AUDIO_SAFETY_UNLOCK_MS);
    return () => clearTimeout(timer);
  }, [audioUrl, audioAlreadyHeard, audioUnlocked, audioFailedOrSkipped, page.pageId]);

  const activeLineIndex = useMemo(() => {
    if (!karaokeReady) return -1;
    return resolveCmsContentDisplayLineIndex(currentTime, lineGroups, {
      holdLastAfterEnd: true,
      audioFinished: didJustFinish,
    });
  }, [currentTime, lineGroups, karaokeReady, didJustFinish]);

  const { displayLineIndex, opacity } = useReadingLineTransition(
    activeLineIndex,
    String(page.pageId ?? '')
  );

  const visibleLineWords = useMemo(() => {
    if (displayLineIndex < 0) return [];
    return lineGroups[displayLineIndex]?.words ?? [];
  }, [displayLineIndex, lineGroups]);

  const activeWordIndex = useMemo(() => {
    if (displayLineIndex !== activeLineIndex || activeLineIndex < 0) return -1;
    return getActiveReadingWordIndexInLine(currentTime, visibleLineWords);
  }, [currentTime, visibleLineWords, displayLineIndex, activeLineIndex]);

  useEffect(() => {
    let cancelled = false;
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setCurrentTime(0);
    setPlayerDurationSec(null);
    setDidJustFinish(false);
    setAudioFailedOrSkipped(false);
    setKaraokeReady(false);
    playbackProbeRef.current = {
      positionSec: 0,
      playerDurationSec: null,
      didJustFinish: false,
    };

    const settleMs = getCmsContentAudioSettleMs();
    const leadMs = getCmsContentKaraokeLeadMs();
    pushAudioDebug(
      {
        pageId: page.pageId,
        pageType: 'content',
        remoteAudioUrl,
        playableAudioUrl: audioUrl,
        fromPrime: null,
        phase: 'idle',
        karaokeReady: false,
        isPlaying: null,
        isLoaded: null,
        positionSec: 0,
        durationSec: null,
        didJustFinish: false,
        audioFailedOrSkipped: false,
        wordsCount: words.length,
        leadMs,
        settleMs,
        engine: 'expo-av',
        lastError: null,
        logLines: [],
      },
      'page mount'
    );

    if (!audioUrl) {
      // No reading audio — do not block Next.
      setAudioFailedOrSkipped(true);
      setKaraokeReady(true);
      pushAudioDebug(
        { phase: 'no_url', audioFailedOrSkipped: true, karaokeReady: true },
        'no playable audio url'
      );
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        pushAudioDebug({ phase: 'take_prime' }, 'takePrimedCmsContentAudio');
        // Prefer a Sound primed on the previous page (critical for short MP3s on iOS).
        // Remap .mpeg → .mp3 so iOS AVPlayer accepts CMS mislabeled MP3 uploads.
        const playableAudioUri = await ensurePlayableCmsAudioUri(audioUrl);
        if (playableAudioUri !== audioUrl) {
          pushAudioDebug(
            { playableAudioUrl: playableAudioUri },
            `audio ext remapped for iOS: ${audioUrl.split('/').pop()} → ${playableAudioUri.split('/').pop()}`
          );
        }
        let s = await takePrimedCmsContentAudio(playableAudioUri);
        if (!s && playableAudioUri !== audioUrl) {
          s = await takePrimedCmsContentAudio(audioUrl);
        }
        const fromPrime = Boolean(s);
        pushAudioDebug({ fromPrime, phase: 'settle' }, fromPrime ? 'primed hit' : 'primed miss → cold create');

        // Always settle on iOS — skipSettle after intro BGM stop caused silent pages.
        const ready = await prepareCmsContentAudioPlayback(() => cancelled);
        if (!ready) {
          if (s) await s.unloadAsync().catch(() => {});
          pushAudioDebug({ phase: 'cancelled' }, 'settle cancelled');
          return;
        }

        if (!s) {
          pushAudioDebug({ phase: 'create' }, `Audio.Sound.createAsync ${playableAudioUri}`);
          const created = await Audio.Sound.createAsync(
            { uri: playableAudioUri },
            { shouldPlay: false, positionMillis: 0 }
          );
          s = created.sound;
        }

        if (cancelled) {
          await s.unloadAsync();
          pushAudioDebug({ phase: 'cancelled' }, 'cancelled cancelled after create');
          return;
        }
        try {
          await s.setProgressUpdateIntervalAsync(20);
        } catch {
          // older expo-av may omit this API
        }
        soundRef.current = s;
        pushAudioDebug({ phase: 'attach', isLoaded: true }, 'status handler attached');
        s.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) {
            pushAudioDebug({ isLoaded: false }, 'status !isLoaded');
            return;
          }
          if (status.durationMillis != null && status.durationMillis > 0) {
            const nextDuration = status.durationMillis / 1000;
            playbackProbeRef.current.playerDurationSec = nextDuration;
            setPlayerDurationSec(nextDuration);
            pushAudioDebug({ durationSec: nextDuration, isLoaded: true });
          }
          if (status.positionMillis != null) {
            const nextPos = status.positionMillis / 1000;
            playbackProbeRef.current.positionSec = nextPos;
            setCurrentTime(nextPos);
            const now = Date.now();
            if (now - lastDebugPosLogRef.current > 250 || status.isPlaying) {
              lastDebugPosLogRef.current = now;
              pushAudioDebug({
                positionSec: nextPos,
                isPlaying: Boolean(status.isPlaying),
                ...(status.isPlaying ? { phase: 'playing' as const } : {}),
              });
            }
          }
          if (status.didJustFinish) {
            playbackProbeRef.current.didJustFinish = true;
            setDidJustFinish(true);
            if (status.durationMillis != null) {
              const endPos = status.durationMillis / 1000;
              playbackProbeRef.current.positionSec = endPos;
              setCurrentTime(endPos);
            }
            pushAudioDebug(
              { didJustFinish: true, isPlaying: false, phase: 'finished' },
              'didJustFinish'
            );
          }
        });

        // Show / arm karaoke BEFORE play — never wait on the iOS watchdog first.
        if (!cancelled) {
          setKaraokeReady(true);
          pushAudioDebug({ phase: 'karaoke_ready', karaokeReady: true }, 'karaoke armed');
        }
        if (leadMs > 0) {
          pushAudioDebug({ phase: 'lead' }, `lead ${leadMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, leadMs));
          if (cancelled) return;
        }

        pushAudioDebug({ phase: 'play' }, 'playCmsSoundWithIosWatchdog');
        await playCmsSoundWithIosWatchdog(s, () => cancelled, { awaitWatchdog: false });
        try {
          const st = await s.getStatusAsync();
          if (st.isLoaded) {
            pushAudioDebug(
              {
                isLoaded: true,
                isPlaying: Boolean(st.isPlaying),
                positionSec: (st.positionMillis ?? 0) / 1000,
                durationSec:
                  st.durationMillis != null && st.durationMillis > 0
                    ? st.durationMillis / 1000
                    : null,
                phase: st.isPlaying ? 'playing' : 'play',
              },
              st.isPlaying ? 'post-play: playing' : 'post-play: NOT playing'
            );
          } else {
            pushAudioDebug({ isLoaded: false, phase: 'failed' }, 'post-play: not loaded');
          }
        } catch (probeError) {
          pushAudioDebug(
            {
              lastError:
                probeError instanceof Error ? probeError.message : String(probeError),
            },
            'post-play status probe failed'
          );
        }
      } catch (error) {
        if (!cancelled) {
          // Audio failed — unlock Next and still show static reading text.
          setAudioFailedOrSkipped(true);
          setKaraokeReady(true);
          pushAudioDebug(
            {
              phase: 'failed',
              audioFailedOrSkipped: true,
              karaokeReady: true,
              lastError: error instanceof Error ? error.message : String(error),
            },
            'playback exception'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [
    page.pageId,
    audioUrl,
    remoteAudioUrl,
    wordTimingFingerprint,
    words.length,
    pushAudioDebug,
  ]);

  const staticReadingLabel = readingText || page.subtitle || 'Subtitle';
  const showKaraokeLine = shouldShowCmsContentKaraokeLine(
    karaokeReady,
    words.length,
    visibleLineWords.length
  );
  const showReadingFallback = shouldShowCmsContentReadingFallback(
    karaokeReady,
    words.length,
    visibleLineWords.length
  );

  const nextAccessibilityLabel = !hasNext
    ? 'Go to next page'
    : waitingOnAudio
      ? 'Next, listening'
      : Boolean(isNextDisabled ?? isPreloading)
        ? 'Next, loading'
        : 'Go to next page';

  useEffect(() => {
    if (!audioDebugEnabled) return;
    pushAudioDebug({
      waitingOnAudio,
      audioFailedOrSkipped,
      karaokeReady,
      wordsCount: words.length,
    });
  }, [
    audioDebugEnabled,
    waitingOnAudio,
    audioFailedOrSkipped,
    karaokeReady,
    words.length,
    pushAudioDebug,
  ]);

  return (
    <View style={styles.fill}>
      <CmsContentAudioDebugPanel
        visible={audioDebugEnabled}
        context={audioDebug}
      />
      <View style={styles.contentGrid}>
        <View style={styles.contentLeft}>
          <View style={styles.dotsRow} accessibilityRole="none" accessibilityLabel="Decorative dots">
            {Array.from({ length: DOT_COUNT }).map((_, i) => (
              <View key={`dot-${i}`} style={styles.dot} />
            ))}
          </View>
          <View style={styles.readingBlock}>
            {showKaraokeLine ? (
              <Animated.View
                style={[styles.readingTextRow, { opacity }]}
                accessibilityRole="text"
                accessibilityLabel="Reading text with timed highlighting"
              >
                {visibleLineWords.map((word, index) => (
                  <Text
                    key={`w-${displayLineIndex}-${index}-${word.w}-${word.start}`}
                    style={[
                      index === activeWordIndex ? styles.wordActive : styles.wordIdle,
                      readingTextStyles,
                    ]}
                  >
                    {word.w}
                    {index < visibleLineWords.length - 1 ? ' ' : ''}
                  </Text>
                ))}
              </Animated.View>
            ) : showReadingFallback ? (
              <Text
                style={[styles.readingText, readingTextStyles]}
                accessibilityRole="text"
                accessibilityLabel="Reading text"
              >
                {staticReadingLabel}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.contentRight}>
          {bgImage ? (
            <Image
              source={{ uri: bgImage }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="stretch"
              accessibilityLabel={page.title || 'Content image'}
              accessibilityRole="image"
            />
          ) : null}
        </View>
      </View>

      <Pressable
        onPress={onPrev}
        disabled={isPreloading || !hasPrev}
        style={({ pressed }) => [
          styles.contentBack,
          (pressed || isPreloading || !hasPrev) && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go to previous page"
        accessibilityState={{ disabled: isPreloading || !hasPrev }}
      >
        <Image
          source={cmsLocalUiAssets.contentBackButton}
          style={styles.btnImg}
          resizeMode="contain"
          accessibilityLabel="Back"
        />
      </Pressable>
      <Pressable
        onPress={onNext}
        disabled={nextLocked || !hasNext}
        style={({ pressed }) => [
          styles.contentNext,
          (pressed || nextLocked || !hasNext) && styles.pressed,
          waitingOnAudio && styles.nextWaiting,
        ]}
        accessibilityRole="button"
        accessibilityLabel={nextAccessibilityLabel}
        accessibilityState={{ disabled: nextLocked || !hasNext }}
      >
        <Image
          source={cmsLocalUiAssets.contentNextButton}
          style={[styles.btnImg, waitingOnAudio && styles.nextWaitingImg]}
          resizeMode="contain"
          accessibilityLabel="Next"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
    position: 'relative',
  },
  demoMediaLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  demoSubtitleWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 1,
  },
  pressed: { opacity: 0.88 },
  nextWaiting: { opacity: 0.55 },
  nextWaitingImg: { opacity: 0.9 },
  btnImg: { width: '100%', height: '100%' },
  introPlay: {
    position: 'absolute',
    left: '50%',
    bottom: '6.1111%',
    width: '7.5%',
    aspectRatio: 1,
    marginLeft: '-3.75%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoPlay: {
    position: 'absolute',
    right: '0.9375%',
    bottom: '5.1852%',
    width: '7.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  demoSubtitle: {
    marginTop: 8,
    fontFamily: Quicksand.semiBold,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  contentGrid: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  contentLeft: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  contentRight: {
    flex: 1,
    backgroundColor: 'rgba(255, 165, 0, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary,
  },
  readingBlock: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    minHeight: 96,
  },
  readingTextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: '96%',
    minHeight: 48,
  },
  readingText: {
    fontFamily: Quicksand.bold,
    color: '#141414',
    textAlign: 'center',
  },
  wordActive: {
    fontFamily: Quicksand.bold,
    color: colors.accent,
  },
  wordIdle: {
    fontFamily: Quicksand.bold,
    color: '#141414',
  },
  contentBack: {
    position: 'absolute',
    left: '0.9375%',
    bottom: '9.8148%',
    width: '7.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentNext: {
    position: 'absolute',
    right: '0.9375%',
    bottom: '9.8148%',
    width: '7.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
