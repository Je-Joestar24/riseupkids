/**
 * CMS player page bodies (intro / demo / content) — layout parity with web cmsTest components.
 * Parent must be a 16:9 stage; buttons use % of parent like web.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { Audio, ResizeMode, Video } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Quicksand } from '@/constants/theme';
import { colors } from '@/config/theme/colors';
import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';

import { resolveCachedMediaUri } from './cms-player-media';
import {
  cmsLocalUiAssets,
  extractReadingWordsFromPage,
  getActiveReadingWordIndex,
  resolveAudioUrl,
  resolveImageUrl,
  resolveIntroBackgroundMusicUrl,
  resolveVideoUrl,
} from './cms-player-shared';

let cmsIntroAudioModeReady = false;

const DOT_COUNT = 14;
/** ~10% larger than previous 20px content reading size */
const CONTENT_READING_FONT = Math.round(20 * 1.1);

export function CmsIntroPage({
  page,
  hasNext,
  isPreloading,
  onNext,
}: {
  page: CmsPlayablePage;
  hasNext: boolean;
  isPreloading: boolean;
  onNext: () => void;
}) {
  const bg = resolveImageUrl(page);
  const backgroundMusicUrl = resolveIntroBackgroundMusicUrl(page);
  const soundRef = useRef<Audio.Sound | null>(null);

  const stopBackgroundMusic = useCallback(async () => {
    const active = soundRef.current;
    soundRef.current = null;
    if (!active) return;
    try {
      await active.stopAsync();
    } catch {
      // already stopped
    }
    try {
      await active.unloadAsync();
    } catch {
      // unload failed
    }
  }, []);

  const handleNext = useCallback(() => {
    void stopBackgroundMusic().finally(() => {
      onNext();
    });
  }, [onNext, stopBackgroundMusic]);

  useEffect(() => {
    let cancelled = false;

    void stopBackgroundMusic();

    if (!backgroundMusicUrl || isPreloading) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        if (!cmsIntroAudioModeReady) {
          try {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
              staysActiveInBackground: false,
            });
          } catch {
            // Audio mode can fail on some runtimes; still attempt playback.
          }
          cmsIntroAudioModeReady = true;
        }

        const uri = await resolveCachedMediaUri(backgroundMusicUrl);
        if (cancelled) return;

        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true, isLooping: true, volume: 1 }
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
      } catch {
        // Optional BGM — continue without audio.
      }
    })();

    return () => {
      cancelled = true;
      void stopBackgroundMusic();
    };
  }, [page.pageId, backgroundMusicUrl, isPreloading, stopBackgroundMusic]);

  return (
    <View style={styles.fill} accessibilityLabel={page.title || 'Intro page'}>
      {bg ? (
        <Image
          source={{ uri: bg }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          accessibilityLabel={page.title || 'Intro'}
          accessibilityRole="image"
        />
      ) : null}
      <Pressable
        onPress={handleNext}
        disabled={isPreloading || !hasNext}
        style={({ pressed }) => [
          styles.introPlay,
          (pressed || isPreloading || !hasNext) && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Play intro and continue"
        accessibilityState={{ disabled: isPreloading || !hasNext }}
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
  hasNext,
  isPreloading,
  onNext,
}: {
  page: CmsPlayablePage;
  hasNext: boolean;
  isPreloading: boolean;
  onNext: () => void;
}) {
  const bg = resolveImageUrl(page);
  const video = resolveVideoUrl(page);

  return (
    <View style={styles.fill}>
      {bg ? (
        <Image
          source={{ uri: bg }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          accessibilityLabel={page.title || 'Demo'}
          accessibilityRole="image"
        />
      ) : null}
      {video ? (
        <Video
          source={{ uri: video }}
          style={StyleSheet.absoluteFillObject}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          useNativeControls={false}
        />
      ) : null}
      <LinearGradient
        colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.38)']}
        style={[StyleSheet.absoluteFillObject, styles.centerContent]}
        pointerEvents="none"
      >
        {page.subtitle ? (
          <Text style={styles.demoSubtitle} accessibilityRole="text">
            {page.subtitle}
          </Text>
        ) : null}
      </LinearGradient>
      <Pressable
        onPress={onNext}
        disabled={isPreloading || !hasNext}
        style={({ pressed }) => [
          styles.demoPlay,
          (pressed || isPreloading || !hasNext) && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Play demo and continue to interactive"
        accessibilityState={{ disabled: isPreloading || !hasNext }}
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
  onPrev,
  onNext,
}: {
  page: CmsPlayablePage;
  hasPrev: boolean;
  hasNext: boolean;
  isPreloading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const bgImage = resolveImageUrl(page);
  const audioUrl = resolveAudioUrl(page);
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  /** Karaoke highlight only after audio is loaded and playback has started (sync with word coloring). */
  const [karaokeReady, setKaraokeReady] = useState(false);

  const readingText = useMemo(
    () =>
      String(page?.reading?.text || (page as { readingText?: string }).readingText || page.subtitle || '').trim(),
    [page]
  );

  const words = useMemo(() => extractReadingWordsFromPage(page), [page]);

  const wordTimingFingerprint = useMemo(
    () => words.map((w) => `${w.start}:${w.end}:${w.w}`).join('|'),
    [words]
  );

  const activeWordIndex = useMemo(() => {
    if (!karaokeReady) return -1;
    return getActiveReadingWordIndex(currentTime, words);
  }, [currentTime, words, karaokeReady]);

  useEffect(() => {
    let cancelled = false;
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setCurrentTime(0);
    setKaraokeReady(false);

    if (!audioUrl) {
      setKaraokeReady(words.length === 0);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const { sound: s } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false, positionMillis: 0 }
        );
        if (cancelled) {
          await s.unloadAsync();
          return;
        }
        try {
          await s.setProgressUpdateIntervalAsync(45);
        } catch {
          // older expo-av may omit this API
        }
        soundRef.current = s;
        s.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.positionMillis != null) {
            setCurrentTime(status.positionMillis / 1000);
          }
          if (status.didJustFinish && status.durationMillis != null) {
            setCurrentTime(status.durationMillis / 1000);
          }
        });
        await s.playAsync();
        if (!cancelled) {
          setKaraokeReady(true);
        }
      } catch {
        if (!cancelled) {
          setKaraokeReady(words.length === 0);
        }
      }
    })();

    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, [page.pageId, audioUrl, wordTimingFingerprint, words.length]);

  return (
    <View style={styles.fill}>
      <View style={styles.contentGrid}>
        <View style={styles.contentLeft}>
          <View style={styles.dotsRow} accessibilityRole="none" accessibilityLabel="Decorative dots">
            {Array.from({ length: DOT_COUNT }).map((_, i) => (
              <View key={`dot-${i}`} style={styles.dot} />
            ))}
          </View>
          <View style={styles.readingBlock}>
            {words.length ? (
              <View
                style={styles.readingTextRow}
                accessibilityRole="text"
                accessibilityLabel="Reading text with timed highlighting"
              >
                {words.map((word, index) => (
                  <Text
                    key={`w-${index}-${word.w}-${word.start}`}
                    style={index === activeWordIndex ? styles.wordActive : styles.wordIdle}
                  >
                    {word.w}
                    {index < words.length - 1 ? ' ' : ''}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.readingText} accessibilityRole="text" accessibilityLabel="Reading text">
                {readingText || page.subtitle || 'Subtitle'}
              </Text>
            )}
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
        disabled={isPreloading || !hasNext}
        style={({ pressed }) => [
          styles.contentNext,
          (pressed || isPreloading || !hasNext) && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go to next page"
        accessibilityState={{ disabled: isPreloading || !hasNext }}
      >
        <Image
          source={cmsLocalUiAssets.contentNextButton}
          style={styles.btnImg}
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
  pressed: { opacity: 0.88 },
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
  },
  readingTextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: '96%',
  },
  readingText: {
    fontFamily: Quicksand.bold,
    fontSize: CONTENT_READING_FONT,
    color: '#141414',
    textAlign: 'center',
  },
  wordActive: {
    fontFamily: Quicksand.bold,
    fontSize: CONTENT_READING_FONT,
    color: colors.accent,
  },
  wordIdle: {
    fontFamily: Quicksand.bold,
    fontSize: CONTENT_READING_FONT,
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
