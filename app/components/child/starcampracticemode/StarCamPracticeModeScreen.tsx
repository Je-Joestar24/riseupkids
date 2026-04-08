import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarCamMapBackButton } from '@/components/child/starcamdynamicdisplay/StarCamMapBackButton';
import { ThemedText } from '@/components/themed-text';

export interface StarCamPracticeModeScreenProps {
  title: string;
  targetLabel: string;
  pronunciationVideoUrl: string | null;
  sampleImageUrl: string | null;
  gradientColors?: readonly [string, string, string];
  borderColor?: string;
  accentColor?: string;
  onBack: () => void;
  onContinue: () => void;
}

export const StarCamPracticeModeScreen = memo(function StarCamPracticeModeScreen({
  title,
  targetLabel,
  pronunciationVideoUrl,
  sampleImageUrl,
  gradientColors = ['#F4EDD8', '#CFE3DF', '#A8D5CF'],
  borderColor = '#85C2B9',
  accentColor = '#85C2B9',
  onBack,
  onContinue,
}: StarCamPracticeModeScreenProps) {
  const [videoLoadFailed, setVideoLoadFailed] = useState(false);
  useEffect(() => {
    setVideoLoadFailed(false);
  }, [pronunciationVideoUrl]);

  const hasPlayableVideo = Boolean(pronunciationVideoUrl) && !videoLoadFailed;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={[styles.root, { borderColor }]}>
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1], gradientColors[2]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <StarCamMapBackButton borderColor={accentColor} onBack={onBack} />

        <View style={styles.content}>
          <ThemedText style={[styles.title, { color: accentColor }]}>{title}</ThemedText>

          <View style={styles.stack}>
            <View style={styles.block}>
              <ThemedText style={[styles.blockLabel, { color: accentColor }]}>Pronunciation Video</ThemedText>
              <View style={styles.mediaFrame}>
                {hasPlayableVideo ? (
                  <Video
                    source={{ uri: pronunciationVideoUrl || '' }}
                    style={styles.video}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isLooping
                    useNativeControls
                    onError={() => setVideoLoadFailed(true)}
                    accessibilityLabel={`${targetLabel} pronunciation video`}
                  />
                ) : (
                  <View style={styles.centered}>
                    <ThemedText style={[styles.placeholderText, { color: accentColor }]}>
                      {pronunciationVideoUrl
                        ? 'Video is unavailable right now.'
                        : 'Pronunciation video will be available soon.'}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            <ThemedText style={[styles.targetText, { color: accentColor }]}>{targetLabel}</ThemedText>

            <View style={styles.block}>
              <ThemedText style={[styles.blockLabel, { color: accentColor }]}>Sample</ThemedText>
              <View style={styles.sampleWrap}>
                <View style={styles.sampleFrame}>
                {sampleImageUrl ? (
                  <Image
                    source={{ uri: sampleImageUrl }}
                    resizeMode="cover"
                    style={styles.sampleImage}
                    accessibilityLabel={`${targetLabel} sample image`}
                  />
                ) : (
                  <View style={styles.centered}>
                    <ThemedText style={[styles.placeholderText, { color: accentColor }]}>No sample image yet.</ThemedText>
                  </View>
                )}
                </View>
              </View>
            </View>
          </View>

          <Pressable
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue to star cam"
            style={({ pressed }) => [styles.continueButton, { backgroundColor: accentColor }, pressed && styles.continueButtonPressed]}>
            <ThemedText style={styles.continueButtonText}>START STARCAM</ThemedText>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4EDD8',
  },
  root: {
    flex: 1,
    borderWidth: 8,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 22,
  },
  title: {
    textAlign: 'center',
    marginBottom: 0,
    fontWeight: '700',
    fontSize: 42,
    letterSpacing: -0.4,
    lineHeight: 42,
  },
  stack: {
    flex: 1,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: 10,
  },
  block: {
    width: '100%',
    height: '38%',
  },
  blockLabel: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '700',
    fontSize: 18,
  },
  mediaFrame: {
    width: '80%',
    flex: 1,
    alignSelf: 'center',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#EDEDED',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  sampleFrame: {
    width: '80%',
    aspectRatio: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#EDEDED',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  sampleWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleImage: {
    width: '100%',
    height: '100%',
  },
  targetText: {
    fontWeight: '700',
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  placeholderText: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 18,
  },
  continueButton: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});

export default StarCamPracticeModeScreen;
