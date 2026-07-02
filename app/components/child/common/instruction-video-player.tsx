/**
 * Instruction video for audio assignments and chants.
 * Routes Bunny embed (WebView + Referer) vs uploaded file (expo-av).
 */

import { ResizeMode, Video } from 'expo-av';
import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { buildPublicUrl } from '@/components/child/module/module-utils';
import { colors } from '@/config/theme/colors';
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
}

export function InstructionVideoPlayer({
  media,
  title = 'Instruction video',
  style,
  autoPlayMutedLoop = true,
}: InstructionVideoPlayerProps) {
  const playback = useMemo(
    () => resolveInstructionVideoPlayback(media, buildPublicUrl),
    [media]
  );

  if (!playback.url) return null;

  if (playback.mode === 'embed') {
    return (
      <View style={[styles.wrap, style]} accessibilityRole="none">
        <BunnyEmbedWebView
          embedUrl={playback.url}
          title={title}
          style={styles.fill}
          showLoadingOverlay
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]} accessibilityRole="none">
      <Video
        key={playback.url}
        source={{ uri: playback.url }}
        style={styles.fill}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={autoPlayMutedLoop}
        isMuted={autoPlayMutedLoop}
        isLooping={autoPlayMutedLoop}
        accessibilityLabel={title}
        onError={() => {
          if (__DEV__) {
            console.warn('[InstructionVideoPlayer] expo-av failed', playback.url);
          }
        }}
      />
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
  wrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
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
