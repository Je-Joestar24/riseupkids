/**
 * The pieces the page of each experience under Explore is drawn from: a coloured band with a centred column, the round print / home button, and one
 * video that shows a play button first and creates the Bunny player only after it is tapped.
 *
 * The colours belong to the client's template and have no theme token.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { BunnyEmbedWebView } from '@/components/child/common/bunny-embed-webview';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { Quicksand } from '@/constants/theme';

export const CREAM = '#f1ebd4';
export const PALE = '#d1e2df';
export const PEACH = '#fae6da';
export const TEAL_INK = '#3e7f76';
export const QUICKSAND_MEDIUM = 'Quicksand_500Medium'; // loaded by the app; not in the Quicksand constants

export function Band({
  color,
  wrapStyle,
  compact,
  label,
  children,
}: {
  color: string;
  wrapStyle?: ViewStyle;
  /** Less space above and below, for a section that should stay short (the printable). */
  compact?: boolean;
  /** Names the section for screen readers (and for the tests). */
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[styles.band, compact && styles.bandCompact, { backgroundColor: color }]}
      accessibilityLabel={label}
      testID={label ? `band-${label}` : undefined}>
      <View style={[styles.wrap, wrapStyle]}>{children}</View>
    </View>
  );
}

export interface PillButtonProps {
  icon: 'printer' | 'home-outline';
  color: string;
  label: string;
  onPress: () => void;
}

export function PillButton({ icon, color, label, onPress }: PillButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: color }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.textInverse} />
      <ThemedText style={styles.buttonText}>{label}</ThemedText>
    </Pressable>
  );
}

export interface VideoBlockProps {
  url: string;
  label: string;
  /** True once the child has tapped play on this video: only then is the player created. */
  playing: boolean;
  onPlay: () => void;
}

/**
 * One video: a play button first, and the Bunny player only after it is tapped, so nothing loads
 * until the child wants it. With no link yet the play button is shown but cannot be pressed.
 */
export function VideoBlock({ url, label, playing, onPlay }: VideoBlockProps) {
  const poster = (
    <>
      <View style={styles.playCircle}>
        <MaterialCommunityIcons name="play" size={36} color={colors.textInverse} />
      </View>
      <ThemedText style={partStyles.placeholderText}>{label}</ThemedText>
    </>
  );

  let content: React.ReactNode;
  if (url && playing) {
    content = (
      <BunnyEmbedWebView
        embedUrl={url}
        title={label}
        style={styles.fill}
        interactionMode="interactive"
        playbackPreset="default"
        autoplay
      />
    );
  } else if (url) {
    content = (
      <Pressable
        onPress={onPlay}
        style={({ pressed }) => [styles.placeholder, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Play ${label}`}>
        {poster}
      </Pressable>
    );
  } else {
    content = (
      <View style={styles.placeholder} accessibilityLabel={label}>
        {poster}
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <View style={styles.player}>{content}</View>
    </View>
  );
}

export const partStyles = StyleSheet.create({
  videoWrap: { maxWidth: 620 },
  printableWrap: { gap: spacing[4] },
  placeholderText: { fontFamily: Quicksand.semiBold, fontSize: 15, color: TEAL_INK, textAlign: 'center' },
  placeholderHint: { fontFamily: QUICKSAND_MEDIUM, fontSize: typography.sizes.xs, color: TEAL_INK, opacity: 0.75 },
});

const styles = StyleSheet.create({
  band: { paddingVertical: spacing[10], paddingHorizontal: spacing[5] },
  bandCompact: { paddingVertical: spacing[5] },  wrap: { width: '100%', maxWidth: 560, alignSelf: 'center', alignItems: 'center' },

  frame: {
    width: '100%',
    backgroundColor: colors.textInverse,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radii.xl,
    padding: spacing[1],
    shadowColor: TEAL_INK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 4,
  },
  player: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: CREAM,
  },
  fill: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[2], padding: spacing[4] },
  playCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },

  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: radii.full,
  },
  buttonText: {
    fontFamily: Quicksand.bold,
    fontSize: 13.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colors.textInverse,
  },
  pressed: { opacity: 0.85 },
});
