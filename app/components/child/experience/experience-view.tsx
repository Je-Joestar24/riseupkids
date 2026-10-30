/**
 * Experience page layout (one page per episode, same layout every time), from the client's template:
 * title, Video 1 (vocabulary, verbs and pronunciation), Video 2 (the story), printable with a print
 * button, closing message with a "Back to home" button, footer.
 *
 * The app header above every child screen already shows the Rise Up Kids logo, so the logo is not
 * repeated inside the page. No social media or outside links appear on this page (store rules).
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import { BunnyEmbedWebView } from '@/components/child/common/bunny-embed-webview';
import { ThemedText } from '@/components/themed-text';
import { EXPERIENCE_COPY, type Experience } from '@/config/experiences';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { Quicksand } from '@/constants/theme';

// Colours that belong to the client's template and have no theme token.
const CREAM = '#f1ebd4';
const PALE = '#d1e2df';
const PEACH = '#fae6da';
const TEAL_INK = '#3e7f76';
const QUICKSAND_MEDIUM = 'Quicksand_500Medium'; // loaded by the app; not in the Quicksand constants

interface ExperienceViewProps {
  experience: Experience;
  onPrint: () => void;
  onHome: () => void;
  /** False while the page is behind another tab: any playing video is stopped so nothing plays unseen. */
  active?: boolean;
}

function Band({
  color,
  wrapStyle,
  compact,
  children,
}: {
  color: string;
  wrapStyle?: ViewStyle;
  /** Less space above and below, for a section that should stay short (the printable). */
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.band, compact && styles.bandCompact, { backgroundColor: color }]}>
      <View style={[styles.wrap, wrapStyle]}>{children}</View>
    </View>
  );
}

interface PillButtonProps {
  icon: 'printer' | 'home-outline';
  color: string;
  label: string;
  onPress: () => void;
}

function PillButton({ icon, color, label, onPress }: PillButtonProps) {
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

interface VideoBlockProps {
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
function VideoBlock({ url, label, playing, onPlay }: VideoBlockProps) {
  const poster = (
    <>
      <View style={styles.playCircle}>
        <MaterialCommunityIcons name="play" size={36} color={colors.textInverse} />
      </View>
      <ThemedText style={styles.placeholderText}>{label}</ThemedText>
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

export function ExperienceView({ experience, onPrint, onHome, active = true }: ExperienceViewProps) {
  const { printable } = experience;

  // Only one video plays at a time: starting one puts the other back to its play button. Leaving
  // the page stops whatever is playing, and it does not start again by itself on return.
  const [playingSlot, setPlayingSlot] = useState<1 | 2 | null>(null);
  useEffect(() => {
    if (!active) setPlayingSlot(null);
  }, [active]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <Band color={CREAM}>
        <ThemedText accessibilityRole="header" style={styles.title}>
          {experience.title}
        </ThemedText>
        <View style={styles.tagline}>
          <ThemedText style={styles.taglineText}>{EXPERIENCE_COPY.taglineLine1}</ThemedText>
          <ThemedText style={[styles.taglineText, styles.accent]}>{EXPERIENCE_COPY.taglineLine2}</ThemedText>
        </View>
      </Band>

      <Band color={PALE} wrapStyle={styles.videoWrap}>
        <VideoBlock
          url={experience.video1}
          label={EXPERIENCE_COPY.video1Label}
          playing={active && playingSlot === 1}
          onPlay={() => setPlayingSlot(1)}
        />
      </Band>

      <Band color={CREAM} wrapStyle={styles.videoWrap}>
        <VideoBlock
          url={experience.video2}
          label={EXPERIENCE_COPY.video2Label}
          playing={active && playingSlot === 2}
          onPlay={() => setPlayingSlot(2)}
        />
      </Band>

      <Band color={PALE} compact wrapStyle={styles.printableWrap}>
        {printable.image ? (
          <View style={styles.printableImage}>
            <Image
              source={printable.image}
              style={styles.printablePicture}
              resizeMode="contain"
              accessibilityLabel={`${experience.title} printable`}
            />
          </View>
        ) : (
          <View style={styles.printablePlaceholder}>
            <ThemedText style={styles.placeholderText}>{EXPERIENCE_COPY.printablePlaceholder}</ThemedText>
            <ThemedText style={styles.placeholderHint}>{EXPERIENCE_COPY.printablePlaceholderHint}</ThemedText>
          </View>
        )}
        <PillButton icon="printer" color={colors.orange} label={printable.button} onPress={onPrint} />
      </Band>

      <Band color={PEACH}>
        <ThemedText accessibilityRole="header" style={styles.closingTitle}>
          {EXPERIENCE_COPY.closingTitle}
        </ThemedText>
        <ThemedText style={styles.stars}>
          <ThemedText style={styles.starGlyph}>★</ThemedText> {EXPERIENCE_COPY.closingStars}{' '}
          <ThemedText style={styles.starGlyph}>★</ThemedText>
        </ThemedText>
        <PillButton icon="home-outline" color={colors.accent} label={EXPERIENCE_COPY.homeButton} onPress={onHome} />
      </Band>

      {/*<View style={styles.footer}>
        <ThemedText style={styles.footerText}>{EXPERIENCE_COPY.footer}</ThemedText>
      </View>*/}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.textInverse },
  pageContent: { flexGrow: 1 },
  band: { paddingVertical: spacing[10], paddingHorizontal: spacing[5] },
  bandCompact: { paddingVertical: spacing[5] },
  wrap: { width: '100%', maxWidth: 560, alignSelf: 'center', alignItems: 'center' },
  videoWrap: { maxWidth: 620 },
  printableWrap: { gap: spacing[4] },

  title: {
    fontFamily: Quicksand.bold,
    fontSize: 34,
    lineHeight: 39,
    color: TEAL_INK,
    textAlign: 'center',
  },
  tagline: { marginTop: 18, alignItems: 'center' },
  taglineText: {
    fontFamily: QUICKSAND_MEDIUM,
    fontSize: typography.sizes.base,
    lineHeight: 26,
    color: TEAL_INK,
    textAlign: 'center',
  },
  accent: { color: colors.orange },

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
  placeholderText: { fontFamily: Quicksand.semiBold, fontSize: 15, color: TEAL_INK, textAlign: 'center' },
  placeholderHint: { fontFamily: QUICKSAND_MEDIUM, fontSize: typography.sizes.xs, color: TEAL_INK, opacity: 0.75 },

  // The wrapper has the picture's shape and the picture fills it. The shape must sit on this wrapper,
  // not on the Image: React Native ignores an Image's aspectRatio and gives it the file's full pixel
  // height, which left a tall empty box around the picture. 627 x 552 is the size of the cropped file
  // (strawberry-banana-smoothie-printable.jpg).
  printableImage: { width: '60%', maxWidth: 220, aspectRatio: 627 / 552, borderRadius: 14, overflow: 'hidden' },
  printablePicture: { width: '100%', height: '100%' },
  printablePlaceholder: {
    width: 190,
    aspectRatio: 3 / 4,
    backgroundColor: colors.textInverse,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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

  closingTitle: {
    fontFamily: Quicksand.bold,
    fontSize: 26,
    lineHeight: 33,
    color: TEAL_INK,
    textAlign: 'center',
  },
  stars: {
    marginTop: spacing[4],
    marginBottom: 22,
    fontFamily: Quicksand.semiBold,
    fontSize: 15,
    color: TEAL_INK,
    textAlign: 'center',
  },
  starGlyph: { color: colors.accent },

  footer: { paddingVertical: 26, paddingHorizontal: spacing[5], alignItems: 'center', backgroundColor: colors.textInverse },
  footerText: { fontFamily: QUICKSAND_MEDIUM, fontSize: typography.sizes.xs, color: TEAL_INK },
});
