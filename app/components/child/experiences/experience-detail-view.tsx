/**
 * Experience page (Explore → Experience → one experience).
 *
 * The client's Experience template (the look the old fixed iPhone page had), with the admin's own content: a cream title band (the
 * description, or the app's own two lines when there is none), one band per video, the printable with its
 * button, and a peach closing message with a button back to home.
 *
 * The app header above every child screen already shows the logo, so it is not repeated here. No social media or
 * outside links appear on this page (store rules); the printable is opened by the screen, which checks its address.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  Band,
  CREAM,
  PALE,
  PEACH,
  PillButton,
  QUICKSAND_MEDIUM,
  TEAL_INK,
  VideoBlock,
  partStyles,
} from '@/components/child/experience/experience-page-parts';
import { RemoteImage } from '@/components/common/remote-image';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { Quicksand } from '@/constants/theme';
import type { ExperienceDetailData } from '@/services/experienceService';
import { EXPERIENCE_DETAIL_COPY, toExperienceView } from '@/utils/experienceFormat';
import { BackArrow } from './experience-detail-states';

export interface ExperienceDetailViewProps {
  experience: ExperienceDetailData;
  /** Turns the server's picture path into an address. */
  getImageUrl: (path: string | null | undefined) => string | null;
  onBack: () => void;
  onHome: () => void;
  /** Opens the printable (the address has already been checked). */
  onPrint: (url: string) => void;
  /** False while the screen is behind another one: any playing video is stopped so nothing plays unseen. */
  active?: boolean;
}

export function ExperienceDetailView({
  experience,
  getImageUrl,
  onBack,
  onHome,
  onPrint,
  active = true,
}: ExperienceDetailViewProps) {
  const view = useMemo(() => toExperienceView(experience, getImageUrl), [experience, getImageUrl]);
  const { title, description, videos, printable } = view;
  const bandColor = { pale: PALE, cream: CREAM } as const;

  // Only one video plays at a time: starting one puts the other back to its play button. Leaving the
  // screen stops whatever is playing, and it does not start again by itself on return.
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  useEffect(() => {
    if (!active) setPlayingKey(null);
  }, [active]);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      <BackArrow onBack={onBack} />
      <Band color={CREAM} label="Title">
        <ThemedText accessibilityRole="header" style={styles.title}>
          {title}
        </ThemedText>
        <View style={styles.tagline}>
          {description ? (
            <ThemedText style={styles.taglineText}>{description}</ThemedText>
          ) : (
            <>
              <ThemedText style={styles.taglineText}>{EXPERIENCE_DETAIL_COPY.taglineLine1}</ThemedText>
              <ThemedText style={[styles.taglineText, styles.accent]}>{EXPERIENCE_DETAIL_COPY.taglineLine2}</ThemedText>
            </>
          )}
        </View>
      </Band>

      {videos.map((video) => (
        <Band key={video.key} color={bandColor[video.band]} wrapStyle={partStyles.videoWrap} label={video.title}>
          <VideoBlock
            url={video.playable ? video.url : ''}
            label={video.title}
            playing={active && playingKey === video.key}
            onPlay={() => setPlayingKey(video.key)}
          />
        </Band>
      ))}

      {printable ? (
        <Band color={bandColor[printable.band]} compact wrapStyle={partStyles.printableWrap} label="Printable">
          {printable.imageUrl ? (
            <View style={styles.printableImage}>
              <RemoteImage
                uri={printable.imageUrl}
                contentFit="contain"
                style={styles.printablePicture}
                accessibilityLabel={`${title} printable`}
              />
            </View>
          ) : null}
          {printable.action ? (
            <PillButton
              icon="printer"
              color={colors.orange}
              label={printable.action.label}
              onPress={() => onPrint(printable.action!.url)}
            />
          ) : null}
        </Band>
      ) : null}

      <Band color={PEACH} label="Closing message">
        <ThemedText accessibilityRole="header" style={styles.closingTitle}>
          {EXPERIENCE_DETAIL_COPY.closingTitle}
        </ThemedText>
        <ThemedText style={styles.stars}>
          <ThemedText style={styles.starGlyph}>★</ThemedText> {EXPERIENCE_DETAIL_COPY.closingStars}{' '}
          <ThemedText style={styles.starGlyph}>★</ThemedText>
        </ThemedText>
        <PillButton icon="home-outline" color={colors.accent} label={EXPERIENCE_DETAIL_COPY.homeButton} onPress={onHome} />
      </Band>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: PEACH },
  pageContent: { flexGrow: 1 },

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

  // The wrapper has a fixed shape and the picture fits inside it without being cropped or stretched (the same
  // shape the template's printable picture has, so every printable sits in the same space).
  printableImage: { width: '60%', maxWidth: 220, aspectRatio: 627 / 552, borderRadius: 14, overflow: 'hidden' },
  printablePicture: { width: '100%', height: '100%' },

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
});
