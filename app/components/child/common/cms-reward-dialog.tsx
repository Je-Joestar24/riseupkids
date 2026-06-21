/**
 * Reward page for CMS built-in book (parity with web CmsBooksModalPlayer renderRewardContent).
 * Media only — home button is rendered by CmsPlayerModal above the native video layer.
 */

import { ResizeMode, Video } from 'expo-av';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Quicksand } from '@/constants/theme';
import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';

import { resolveImageUrl, resolveVideoUrl } from './cms-player-shared';
import { resolvePlayableMediaUri } from './cms-player-media';
import { useCmsMediaUriMap } from './cms-player-media-context';

export interface CmsRewardStageProps {
  page: CmsPlayablePage;
  style?: StyleProp<ViewStyle>;
}

export function CmsRewardStage({ page, style }: CmsRewardStageProps) {
  const mediaUriMap = useCmsMediaUriMap();
  const bgImage = resolvePlayableMediaUri(resolveImageUrl(page), mediaUriMap);
  const videoUrl = resolvePlayableMediaUri(resolveVideoUrl(page), mediaUriMap);

  return (
    <View style={[styles.stage, style]} accessibilityRole="none">
      <View style={styles.mediaLayer} pointerEvents="none">
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
      </View>

      {page.subtitle ? (
        <View style={styles.subtitleWrap} pointerEvents="none">
          <Text style={styles.subtitle} accessibilityRole="text">
            {page.subtitle}
          </Text>
        </View>
      ) : null}
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
  mediaLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  subtitleWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  subtitle: {
    fontFamily: Quicksand.semiBold,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
});
