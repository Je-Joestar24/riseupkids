/**
 * Reward page for CMS built-in book (parity with web CmsBooksModalPlayer renderRewardContent).
 * Media only — home button is rendered by CmsPlayerModal above the native video layer.
 */

import { Audio } from 'expo-av';
import React, { useEffect, useRef } from 'react';
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

import { resolveImageUrl, resolveRewardAudioUrl, resolveVideoUrl } from './cms-player-shared';
import { resolvePlayableMediaUri } from './cms-player-media';
import { useCmsMediaUriMap } from './cms-player-media-context';
import { CmsLoopingBackgroundVideo } from './cms-looping-background-video';

export interface CmsRewardStageProps {
  page: CmsPlayablePage;
  style?: StyleProp<ViewStyle>;
}

export function CmsRewardStage({ page, style }: CmsRewardStageProps) {
  const mediaUriMap = useCmsMediaUriMap();
  const bgImage = resolvePlayableMediaUri(resolveImageUrl(page), mediaUriMap);
  const videoUrl = resolvePlayableMediaUri(resolveVideoUrl(page), mediaUriMap);
  const rewardAudioUrl = resolvePlayableMediaUri(resolveRewardAudioUrl(page), mediaUriMap);
  const rewardSoundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let active = true;

    const stopRewardAudio = async () => {
      const sound = rewardSoundRef.current;
      rewardSoundRef.current = null;
      if (!sound) return;
      try {
        await sound.stopAsync();
      } catch {
        // ignore unload races
      }
      try {
        await sound.unloadAsync();
      } catch {
        // ignore unload races
      }
    };

    const playRewardAudio = async () => {
      if (!rewardAudioUrl || !active) return;
      await stopRewardAudio();
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: rewardAudioUrl },
          { shouldPlay: true, isLooping: false }
        );
        if (!active) {
          await sound.unloadAsync();
          return;
        }
        rewardSoundRef.current = sound;
      } catch {
        // optional audio — ignore playback failures
      }
    };

    void playRewardAudio();

    return () => {
      active = false;
      void stopRewardAudio();
    };
  }, [rewardAudioUrl]);

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
          <CmsLoopingBackgroundVideo
            uri={videoUrl}
            accessibilityLabel={page.title || 'Reward video'}
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
