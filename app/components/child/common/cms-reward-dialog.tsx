/**
 * Reward page for CMS built-in book (parity with web CmsBooksModalPlayer renderRewardContent).
 * Designed to fill a 16:9 stage; button positions use % of stage (1920×1080 design).
 */

import { LinearGradient } from 'expo-linear-gradient';
import { ResizeMode, Video } from 'expo-av';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Quicksand } from '@/constants/theme';
import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';

import { cmsLocalUiAssets, resolveImageUrl, resolveVideoUrl } from './cms-player-shared';

export interface CmsRewardStageProps {
  page: CmsPlayablePage;
  onHome: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CmsRewardStage({ page, onHome, disabled, style }: CmsRewardStageProps) {
  const bgImage = resolveImageUrl(page);
  const videoUrl = resolveVideoUrl(page);

  return (
    <View style={[styles.stage, style]} accessibilityRole="none">
      {bgImage ? (
        <Image
          source={{ uri: bgImage }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          accessibilityRole="image"
          accessibilityLabel={page.title || 'Reward background'}
        />
      ) : null}

      {videoUrl ? (
        <Video
          source={{ uri: videoUrl }}
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
        style={[StyleSheet.absoluteFillObject, styles.gradient]}
        pointerEvents="none"
      />

      <View style={styles.subtitleWrap} pointerEvents="none">
        {page.subtitle ? (
          <Text style={styles.subtitle} accessibilityRole="text">
            {page.subtitle}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={onHome}
        disabled={disabled}
        style={({ pressed }) => [
          styles.homeBtn,
          (pressed || disabled) && styles.homeBtnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Go home and finish book"
        accessibilityState={{ disabled: Boolean(disabled) }}
      >
        <Image
          source={cmsLocalUiAssets.homeButton}
          style={styles.homeImg}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessibilityLabel="Home button"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitleWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  subtitle: {
    fontFamily: Quicksand.semiBold,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.95,
  },
  /** Web: right 0.9375%, bottom 5.1852%, width 7.5%, aspect 1 */
  homeBtn: {
    position: 'absolute',
    right: '0.9375%',
    bottom: '5.1852%',
    width: '7.5%',
    aspectRatio: 1,
    zIndex: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeBtnPressed: {
    opacity: 0.88,
  },
  homeImg: {
    width: '100%',
    height: '100%',
  },
});
