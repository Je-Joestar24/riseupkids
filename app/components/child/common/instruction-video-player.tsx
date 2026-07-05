/**
 * Instruction video for audio assignments and chants.
 * Routes Bunny embed (WebView + Referer) vs uploaded file (expo-av).
 */

import { MaterialIcons } from '@expo/vector-icons';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { buildPublicUrl } from '@/components/child/module/module-utils';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { resolveInstructionVideoPlayback } from '@/utils/instructionVideoPlayback';

import { BunnyEmbedWebView } from './bunny-embed-webview';

export interface InstructionVideoPlayerProps {
  media: unknown;
  title?: string;
  style?: StyleProp<ViewStyle>;
  /** When true, autoplays muted loop (assignment/chant default). */
  autoPlayMutedLoop?: boolean;
  /** When true, shows labeled Play / Pause buttons below the video. */
  showPlaybackButtons?: boolean;
}

function VideoPlaybackControls({
  isPlaying,
  onPlay,
  onPause,
}: {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
}) {
  return (
    <View style={styles.controlsRow}>
      <Pressable
        style={[styles.controlBtn, styles.playBtn, isPlaying && styles.controlBtnDisabled]}
        onPress={onPlay}
        disabled={isPlaying}
        accessibilityRole="button"
        accessibilityLabel="Play video">
        <MaterialIcons name="play-arrow" size={22} color={colors.textInverse} />
        <ThemedText style={styles.playBtnText}>Play</ThemedText>
      </Pressable>
      <Pressable
        style={[styles.controlBtn, styles.pauseBtn, !isPlaying && styles.controlBtnDisabled]}
        onPress={onPause}
        disabled={!isPlaying}
        accessibilityRole="button"
        accessibilityLabel="Pause video">
        <MaterialIcons name="pause" size={22} color={colors.secondary} />
        <ThemedText style={styles.pauseBtnText}>Pause</ThemedText>
      </Pressable>
    </View>
  );
}

export function InstructionVideoPlayer({
  media,
  title = 'Instruction video',
  style,
  autoPlayMutedLoop = true,
  showPlaybackButtons = false,
}: InstructionVideoPlayerProps) {
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playback = useMemo(
    () => resolveInstructionVideoPlayback(media, buildPublicUrl),
    [media]
  );

  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
  }, []);

  const handlePlay = useCallback(async () => {
    try {
      await videoRef.current?.playAsync();
    } catch {
      // ignore
    }
  }, []);

  const handlePause = useCallback(async () => {
    try {
      await videoRef.current?.pauseAsync();
    } catch {
      // ignore
    }
  }, []);

  if (!playback.url) return null;

  const useExternalControls = showPlaybackButtons && !autoPlayMutedLoop;

  if (playback.mode === 'embed') {
    return (
      <View style={[styles.container, style]} accessibilityRole="none">
        <View style={styles.wrap}>
          <BunnyEmbedWebView
            embedUrl={playback.url}
            title={title}
            style={styles.fill}
            showLoadingOverlay
          />
        </View>
        {useExternalControls ? (
          <ThemedText style={styles.embedHint}>
            Tap the video, then use its play and pause controls to listen to each question.
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} accessibilityRole="none">
      <View style={styles.wrap}>
        <Video
          ref={videoRef}
          key={playback.url}
          source={{ uri: playback.url }}
          style={styles.fill}
          useNativeControls={!useExternalControls}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={autoPlayMutedLoop}
          isMuted={autoPlayMutedLoop}
          isLooping={autoPlayMutedLoop}
          accessibilityLabel={title}
          onPlaybackStatusUpdate={useExternalControls ? handlePlaybackStatus : undefined}
          onError={() => {
            if (__DEV__) {
              console.warn('[InstructionVideoPlayer] expo-av failed', playback.url);
            }
          }}
        />
      </View>
      {useExternalControls ? (
        <VideoPlaybackControls isPlaying={isPlaying} onPlay={handlePlay} onPause={handlePause} />
      ) : null}
    </View>
  );
}

export function InstructionVideoUnavailable({
  message = 'Instruction video is unavailable.',
  style,
}: {
  message?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.wrap, styles.unavailable, style]} accessibilityRole="text">
      <ThemedText style={styles.unavailableText}>{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: spacing[2],
  },
  wrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radii.lg,
  },
  controlBtnDisabled: {
    opacity: 0.45,
  },
  playBtn: {
    backgroundColor: colors.secondary,
  },
  playBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
  pauseBtn: {
    borderWidth: 2,
    borderColor: colors.secondary,
    backgroundColor: colors.textInverse,
  },
  pauseBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.secondary,
  },
  embedHint: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  fill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  unavailable: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: colors.bgTertiary,
  },
  unavailableText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
