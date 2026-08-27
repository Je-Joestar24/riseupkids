/**
 * Brief play/pause badge after a child taps the Bunny watch-only wall.
 * Orange theme; hides itself (parent clears after 1s).
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors } from '@/config/theme/colors';
import type { BunnyEmbedPlaybackHint } from '@/hooks/useBunnyEmbedPlaybackHint';
import { BUNNY_EMBED_PLAYBACK_HINT_MS } from '@/utils/bunnyEmbedPlayScript';

export function BunnyEmbedPlaybackHintOverlay({
  hint,
}: {
  hint: BunnyEmbedPlaybackHint | null;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!hint) {
      opacity.setValue(0);
      return undefined;
    }
    opacity.setValue(1);
    const fade = Animated.timing(opacity, {
      toValue: 0,
      duration: 180,
      delay: Math.max(0, BUNNY_EMBED_PLAYBACK_HINT_MS - 180),
      useNativeDriver: true,
    });
    fade.start();
    return () => fade.stop();
  }, [hint, opacity]);

  if (!hint) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={styles.badge}
        accessibilityRole="image"
        accessibilityLabel={hint.playing ? 'Playing' : 'Paused'}
      >
        <MaterialIcons
          name={hint.playing ? 'play-arrow' : 'pause'}
          size={hint.playing ? 44 : 40}
          color={colors.textInverse}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 18,
  },
  badge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.orange,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});
