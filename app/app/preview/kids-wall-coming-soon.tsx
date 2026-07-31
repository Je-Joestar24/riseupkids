/**
 * Standalone preview of Kids Wall Coming Soon (PC / Android / any platform).
 * Open: /preview/kids-wall-coming-soon
 *
 * Does not require the env preview flag — always renders the artwork.
 * To preview the full integration (nav label + wall tab + hidden explore share),
 * set EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW=true in app/.env and restart Expo.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WallComingSoon } from '@/components/child/wall/wall-coming-soon';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';

export default function KidsWallComingSoonPreviewScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.banner}>
        <ThemedText style={styles.bannerText}>
          Preview — Kids Wall Coming Soon (iOS)
        </ThemedText>
      </View>
      <View style={styles.body}>
        <WallComingSoon />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#D4E6E3',
  },
  banner: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.secondary,
  },
  bannerText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textInverse,
    textAlign: 'center',
  },
  body: {
    flex: 1,
  },
});
