import { Audio, Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { StarCamMapBackButton } from '@/components/child/starcamdynamicdisplay/StarCamMapBackButton';
import { StarCamPracticeMissingVideoSkip } from '@/components/child/starcampracticemode/StarCamPracticeMissingVideoSkip';
import { ThemedText } from '@/components/themed-text';
import type { StarCamPracticeSequenceItem } from '@/hooks/useStarCamPracticeSequence';
import { useStarCamPracticeSequence } from '@/hooks/useStarCamPracticeSequence';
import { useStarCamPracticeWatchProgress } from '@/hooks/useStarCamPracticeWatchProgress';
import { getStarCamPracticeModeLayout } from '@/utils/starCamPracticeModeLayout';

const applyVideoPlaybackRate = async (player: Video | null, rate: number) => {
  if (!player) return;

  try {
    if (Platform.OS === 'ios') {
      // iOS ignores the shouldCorrectPitch prop on <Video>; rate must be applied imperatively.
      await player.setRateAsync(rate, true, Audio.PitchCorrectionQuality.High);
      return;
    }

    await player.setRateAsync(rate, true);
  } catch {
    // Player may not be loaded yet.
  }
};

export interface StarCamPracticeModeScreenProps {
  title: string;
  items: StarCamPracticeSequenceItem[];
  childId?: string | null;
  missionId?: string | null;
  gradientColors?: readonly [string, string, string];
  borderColor?: string;
  accentColor?: string;
  onBack: () => void;
  onComplete: () => void;
}

export const StarCamPracticeModeScreen = memo(function StarCamPracticeModeScreen({
  title,
  items,
  childId = null,
  missionId = null,
  gradientColors = ['#F4EDD8', '#CFE3DF', '#A8D5CF'],
  borderColor = '#85C2B9',
  accentColor = '#85C2B9',
  onBack,
  onComplete,
}: StarCamPracticeModeScreenProps) {
  const isFocused = useIsFocused();
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = getStarCamPracticeModeLayout(winW, winH, insets);
  const videoRef = useRef<Video | null>(null);
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  const { isItemWatched, markItemWatched, isLoaded: isWatchStateLoaded } = useStarCamPracticeWatchProgress({
    childId,
    missionId,
  });

  useEffect(() => {
    if (isFocused) return;
    const stopAndUnload = async () => {
      try {
        await videoRef.current?.stopAsync?.();
      } catch {
        // no-op; stopping can throw when video isn't loaded yet
      }
      try {
        await videoRef.current?.unloadAsync?.();
      } catch {
        // no-op; unloading can throw when already unloaded
      }
    };
    void stopAndUnload();
  }, [isFocused]);

  const {
    current,
    progressText,
    passNumber,
    playbackRate,
    isVideoLoading,
    isShowingNextIntro,
    isShowingMissingVideoSkip,
    onVideoLoadStart,
    onVideoLoad,
    onVideoError,
    onPlaybackStatusUpdate,
    skipToNext,
  } = useStarCamPracticeSequence({
    items,
    stepDelayMs: 900,
    nextToastMs: 500,
    missingVideoSkipDelayMs: 500,
    onComplete,
  });

  const targetLabel = current?.targetLabel || '...';
  const itemKey = current?.itemKey ?? null;
  const pronunciationVideoUrl = current?.pronunciationVideoUrl || null;
  const sampleImageUrl = current?.sampleImageUrl || null;

  useEffect(() => {
    setVideoLoadFailed(false);
  }, [itemKey, pronunciationVideoUrl]);

  const hasPlayableVideo = Boolean(pronunciationVideoUrl) && !videoLoadFailed;
  const canShowSkipNow =
    isWatchStateLoaded &&
    hasPlayableVideo &&
    !isVideoLoading &&
    !isShowingNextIntro &&
    !isShowingMissingVideoSkip &&
    isItemWatched(itemKey);

  const handleVideoFinished = useCallback(() => {
    if (itemKey) {
      void markItemWatched(itemKey);
    }
  }, [itemKey, markItemWatched]);

  const applyCurrentPlaybackRate = useCallback(async () => {
    await applyVideoPlaybackRate(videoRef.current, playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    if (!isFocused || isShowingNextIntro || !hasPlayableVideo) return;
    void applyCurrentPlaybackRate();
  }, [
    applyCurrentPlaybackRate,
    hasPlayableVideo,
    isFocused,
    isShowingNextIntro,
    passNumber,
    playbackRate,
    pronunciationVideoUrl,
  ]);

  const handleVideoLoad = useCallback(() => {
    onVideoLoad();
    void applyCurrentPlaybackRate();
  }, [applyCurrentPlaybackRate, onVideoLoad]);

  const handlePlaybackStatusUpdate = useCallback(
    (status: unknown) => {
      if (status && typeof status === 'object' && 'didJustFinish' in status && status.didJustFinish) {
        handleVideoFinished();
      }
      onPlaybackStatusUpdate(status);
    },
    [handleVideoFinished, onPlaybackStatusUpdate]
  );

  const handleSkipNow = useCallback(async () => {
    try {
      await videoRef.current?.stopAsync?.();
    } catch {
      // no-op
    }
    skipToNext();
  }, [skipToNext]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={[styles.root, { borderColor }]}>
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1], gradientColors[2]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <StarCamMapBackButton borderColor={accentColor} onBack={onBack} />

        <View style={[styles.content, { paddingTop: layout.contentPaddingTop }]}>
          <ThemedText
            style={[
              styles.title,
              {
                color: accentColor,
                fontSize: layout.titleFontSize,
                lineHeight: layout.titleLineHeight,
              },
            ]}>
            {title}
          </ThemedText>
          <View style={styles.progressPill}>
            <ThemedText style={[styles.progressText, { color: accentColor }]}>
              {progressText} • Round {passNumber}/2
            </ThemedText>
          </View>

          <View style={styles.stack}>
            <View
              style={[
                styles.mediaFrame,
                {
                  width: layout.mediaSize,
                  height: layout.mediaSize,
                  borderRadius: layout.mediaRadius,
                },
              ]}>
              {hasPlayableVideo ? (
                <Video
                  ref={videoRef}
                  key={`${passNumber}-${progressText}-${pronunciationVideoUrl ?? 'no-video'}`}
                  source={{ uri: pronunciationVideoUrl || '' }}
                  style={styles.mediaCover}
                  resizeMode={ResizeMode.COVER}
                  shouldPlay={isFocused && !isShowingNextIntro}
                  isLooping={false}
                  rate={playbackRate}
                  shouldCorrectPitch
                  useNativeControls={false}
                  onLoadStart={onVideoLoadStart}
                  onLoad={handleVideoLoad}
                  onError={() => {
                    setVideoLoadFailed(true);
                    onVideoError();
                  }}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                  accessibilityLabel={`${targetLabel} pronunciation video`}
                />
              ) : isShowingMissingVideoSkip ? (
                <StarCamPracticeMissingVideoSkip accentColor={accentColor} />
              ) : (
                <View style={styles.centered}>
                  <ThemedText style={[styles.placeholderText, { color: accentColor }]}>
                    Video is unavailable right now.
                  </ThemedText>
                </View>
              )}
              {hasPlayableVideo && isVideoLoading ? (
                <View style={styles.videoLoadingOverlay} pointerEvents="none">
                  <ActivityIndicator size="large" color={accentColor} />
                </View>
              ) : null}
            </View>

            <ThemedText
              style={[
                styles.targetText,
                {
                  color: accentColor,
                  marginVertical: layout.targetMargin,
                  fontSize: layout.targetFontSize,
                  lineHeight: layout.targetLineHeight,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}>
              {targetLabel}
            </ThemedText>

            <View
              style={[
                styles.sampleFrame,
                {
                  width: layout.mediaSize,
                  height: layout.mediaSize,
                  borderRadius: layout.mediaRadius,
                },
              ]}>
              {sampleImageUrl ? (
                <Image
                  source={{ uri: sampleImageUrl }}
                  resizeMode="cover"
                  style={styles.mediaCover}
                  accessibilityLabel={`${targetLabel} sample image`}
                />
              ) : (
                <View style={styles.centered}>
                  <ThemedText style={[styles.placeholderText, { color: accentColor }]}>No sample image yet.</ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>

        {canShowSkipNow ? (
          <Pressable
            style={[styles.skipFab, { borderColor: accentColor, bottom: layout.compact ? 12 : 24 }]}
            onPress={() => void handleSkipNow()}
            accessibilityRole="button"
            accessibilityLabel={`Skip ${targetLabel} pronunciation video`}
            accessibilityHint="Skips this vocabulary video because you have already watched it">
            <ThemedText style={[styles.skipFabText, { color: accentColor }]}>Skip now</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4EDD8',
  },
  root: {
    flex: 1,
    minHeight: 0,
    borderWidth: 8,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  title: {
    textAlign: 'center',
    marginBottom: 0,
    fontWeight: '700',
    fontSize: 42,
    letterSpacing: -0.4,
    lineHeight: 42,
  },
  progressPill: {
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  progressText: {
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
  stack: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaFrame: {
    alignSelf: 'center',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#EDEDED',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  mediaCover: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  sampleFrame: {
    alignSelf: 'center',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#EDEDED',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  targetText: {
    fontWeight: '700',
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  placeholderText: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 18,
  },
  skipFab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    zIndex: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  skipFabText: {
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 18,
  },
});

export default StarCamPracticeModeScreen;
