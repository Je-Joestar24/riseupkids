import { Audio, Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { colors } from '@/config/theme/colors';

export interface StarCamMissionSuccessScreenProps {
  missionTitle: string;
  subtitle?: string;
  rewardVideoUrl?: string | null;
  rewardAudioUrl?: string | null;
  gradientColors?: readonly [string, string, string];
  borderColor?: string;
  accentColor?: string;
  onGoToStarCam: () => void;
  onTryAgain: () => void;
}

type ConfettiSpec = {
  key: string;
  top?: `${number}%`;
  bottom?: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
  size: number;
  color: string;
  delayMs: number;
  durationMs: number;
};

const CONFETTI_ITEMS: ConfettiSpec[] = [
  { key: 'c1', top: '2%', left: '12%', size: 8, color: colors.orange, delayMs: 0, durationMs: 2400 },
  { key: 'c2', top: '8%', right: '18%', size: 10, color: colors.accent, delayMs: 200, durationMs: 2600 },
  { key: 'c3', top: '22%', left: '4%', size: 7, color: '#FFFFFF', delayMs: 400, durationMs: 2300 },
  { key: 'c4', top: '18%', right: '6%', size: 9, color: colors.secondary, delayMs: 300, durationMs: 2500 },
  { key: 'c5', bottom: '28%', left: '5%', size: 10, color: colors.accent, delayMs: 100, durationMs: 2800 },
  { key: 'c6', bottom: '24%', right: '8%', size: 9, color: '#FFFFFF', delayMs: 500, durationMs: 2500 },
  { key: 'c7', bottom: '14%', left: '16%', size: 8, color: colors.orange, delayMs: 650, durationMs: 2900 },
  { key: 'c8', bottom: '18%', right: '16%', size: 7, color: colors.secondary, delayMs: 350, durationMs: 2400 },
];

const BOKEH_ITEMS: ReadonlyArray<{
  key: string;
  left: `${number}%`;
  top: `${number}%`;
  size: number;
  color: string;
}> = [
  { key: 'b1', left: '8%', top: '12%', size: 72, color: colors.secondary },
  { key: 'b2', left: '75%', top: '16%', size: 96, color: colors.orange },
  { key: 'b3', left: '12%', top: '66%', size: 86, color: colors.accent },
  { key: 'b4', left: '70%', top: '70%', size: 62, color: colors.secondary },
];

export const StarCamMissionSuccessScreen = memo(function StarCamMissionSuccessScreen({
  missionTitle,
  subtitle = 'You found all 7 objects!',
  rewardVideoUrl = null,
  rewardAudioUrl = null,
  gradientColors = [colors.gradientStart, colors.gradientMid, colors.gradientEnd],
  borderColor = colors.primary,
  accentColor = colors.orange,
  onGoToStarCam,
  onTryAgain,
}: StarCamMissionSuccessScreenProps) {
  const [isVideoFailed, setIsVideoFailed] = useState(false);
  const [isAudioAvailable, setIsAudioAvailable] = useState(Boolean(rewardAudioUrl));
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioRef = useRef<Audio.Sound | null>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(CONFETTI_ITEMS.map(() => new Animated.Value(0))).current;
  const mainEmojiBounce = useRef(new Animated.Value(0)).current;
  const wiggleAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  const hasVideo = Boolean(rewardVideoUrl) && !isVideoFailed;

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    const confettiLoops = confettiAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(CONFETTI_ITEMS[index].delayMs),
          Animated.timing(anim, {
            toValue: 1,
            duration: CONFETTI_ITEMS[index].durationMs,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      )
    );
    confettiLoops.forEach((loop) => loop.start());

    return () => {
      glowLoop.stop();
      confettiLoops.forEach((loop) => loop.stop());
    };
  }, [confettiAnims, glowAnim]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        void audioRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (hasVideo) return;
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(mainEmojiBounce, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(mainEmojiBounce, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    const wiggleLoops = wiggleAnims.map((anim, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay((index + 1) * 100),
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
    );
    bounceLoop.start();
    wiggleLoops.forEach((loop) => loop.start());
    return () => {
      bounceLoop.stop();
      wiggleLoops.forEach((loop) => loop.stop());
    };
  }, [hasVideo, mainEmojiBounce, wiggleAnims]);

  const ensureLoadedAndPlayAudio = async () => {
    if (!rewardAudioUrl) return;
    try {
      setIsAudioLoading(true);
      if (!audioRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: rewardAudioUrl },
          { shouldPlay: true, isLooping: true, volume: 1 }
        );
        audioRef.current = sound;
      } else {
        await audioRef.current.playAsync();
      }
      setIsAudioPlaying(true);
    } catch {
      setIsAudioAvailable(false);
      setIsAudioPlaying(false);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const pauseAudio = async () => {
    try {
      if (audioRef.current) await audioRef.current.pauseAsync();
    } finally {
      setIsAudioPlaying(false);
    }
  };

  useEffect(() => {
    if (!rewardAudioUrl) {
      setIsAudioAvailable(false);
      return;
    }
    void ensureLoadedAndPlayAudio();
    // We intentionally run this only when reward audio URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rewardAudioUrl]);

  const mediaCardScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  const mediaCardOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.86, 1],
  });

  const audioButtonLabel = useMemo(() => {
    if (!isAudioAvailable) return 'NO REWARD SOUND YET';
    if (isAudioLoading) return 'LOADING SOUND...';
    return isAudioPlaying ? 'SOUND: ON' : 'SOUND: OFF';
  }, [isAudioAvailable, isAudioLoading, isAudioPlaying]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={[styles.root, { borderColor }]}>
        <LinearGradient colors={[gradientColors[0], gradientColors[1], gradientColors[2]]} style={StyleSheet.absoluteFill} />
        <View style={styles.bokehLayer} pointerEvents="none">
          {BOKEH_ITEMS.map((item) => (
            <View
              key={item.key}
              style={[
                styles.bokeh,
                {
                  left: item.left,
                  top: item.top,
                  width: item.size,
                  height: item.size,
                  backgroundColor: item.color,
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.confettiLayer} pointerEvents="none">
          {CONFETTI_ITEMS.map((item, index) => {
            const translateY = confettiAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [-12, 24],
            });
            const rotate = confettiAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '180deg'],
            });
            return (
              <Animated.View
                key={item.key}
                style={[
                  styles.confetti,
                  {
                    top: item.top,
                    left: item.left,
                    right: item.right,
                    bottom: item.bottom,
                    width: item.size,
                    height: item.size,
                    borderRadius: item.size / 2,
                    backgroundColor: item.color,
                    transform: [{ translateY }, { rotate }],
                  },
                ]}
              />
            );
          })}
        </View>

        <View style={styles.content}>
          <View style={styles.progressBadge}>
            <ThemedText style={styles.progressValue}>7/7</ThemedText>
            <ThemedText style={styles.progressLabel}>PERFECT</ThemedText>
          </View>

          <ThemedText style={styles.title}>Mission Complete!</ThemedText>
          <Animated.View style={[styles.mediaCard, { transform: [{ scale: mediaCardScale }], opacity: mediaCardOpacity }]}>
            {hasVideo ? (
              <Video
                source={{ uri: rewardVideoUrl || '' }}
                style={styles.video}
                shouldPlay
                isLooping
                resizeMode={ResizeMode.COVER}
                useNativeControls
                onError={() => setIsVideoFailed(true)}
                accessibilityLabel="Mission reward video"
              />
            ) : (
              <View style={styles.placeholderWrap}>
                <View style={styles.placeholderInner}>
                  <Animated.View
                    style={[
                      styles.mainEmojiWrap,
                      {
                        transform: [
                          {
                            translateY: mainEmojiBounce.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, -10],
                            }),
                          },
                        ],
                      },
                    ]}>
                    <ThemedText style={styles.placeholderEmoji}>🐻</ThemedText>
                  </Animated.View>
                  <View style={styles.placeholderRow}>
                    <Animated.View
                      style={{
                        transform: [
                          {
                            rotate: wiggleAnims[0].interpolate({
                              inputRange: [0, 1],
                              outputRange: ['-6deg', '6deg'],
                            }),
                          },
                        ],
                      }}>
                      <ThemedText style={styles.placeholderSmallEmoji}>🌿</ThemedText>
                    </Animated.View>
                    <Animated.View
                      style={{
                        transform: [
                          {
                            rotate: wiggleAnims[1].interpolate({
                              inputRange: [0, 1],
                              outputRange: ['-6deg', '6deg'],
                            }),
                          },
                        ],
                      }}>
                      <ThemedText style={styles.placeholderSmallEmoji}>📚</ThemedText>
                    </Animated.View>
                    <Animated.View
                      style={{
                        transform: [
                          {
                            rotate: wiggleAnims[2].interpolate({
                              inputRange: [0, 1],
                              outputRange: ['-6deg', '6deg'],
                            }),
                          },
                        ],
                      }}>
                      <ThemedText style={styles.placeholderSmallEmoji}>✏️</ThemedText>
                    </Animated.View>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>

          <ThemedText style={styles.missionName}>{missionTitle}</ThemedText>
          <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>
{/* 
          <Pressable
            style={({ pressed }) => [styles.audioToggleButton, pressed && styles.pressedButton, !isAudioAvailable && styles.disabledButton]}
            onPress={() => {
              if (!isAudioAvailable || isAudioLoading) return;
              if (isAudioPlaying) {
                void pauseAudio();
                return;
              }
              void ensureLoadedAndPlayAudio();
            }}
            accessibilityRole="button"
            accessibilityLabel="Toggle mission reward sound">
            <ThemedText style={styles.audioToggleText}>{audioButtonLabel}</ThemedText>
          </Pressable> */}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressedButton]}
              onPress={onGoToStarCam}
              accessibilityRole="button"
              accessibilityLabel="Go to Star Cam home">
              <MaterialIcons name="photo-camera" size={24} color={colors.orange} />
              <ThemedText style={styles.primaryButtonText}>STAR CAM</ThemedText>
            </Pressable>
            <ThemedText style={styles.footerHint}>Take your victory photo!</ThemedText>

            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressedButton]}
              onPress={onTryAgain}
              accessibilityRole="button"
              accessibilityLabel="Play mission again">
              <ThemedText style={styles.secondaryButtonText}>PLAY AGAIN</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bgLogin,
  },
  root: {
    flex: 1,
    borderWidth: 8,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingTop: 64,
    paddingBottom: 24,
    zIndex: 3,
  },
  bokehLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  bokeh: {
    position: 'absolute',
    opacity: 0.16,
    borderRadius: 999,
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  confetti: {
    position: 'absolute',
    opacity: 0.9,
  },
  progressBadge: {
    position: 'absolute',
    top: 18,
    left: 14,
    zIndex: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  progressValue: {
    color: colors.secondary,
    textAlign: 'center',
    fontSize: 16,
    fontFamily: Fonts.bold,
    fontWeight: '700',
  },
  progressLabel: {
    color: colors.primary,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    marginTop: -1,
  },
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 42,
    lineHeight: 46,
    textShadowColor: 'rgba(0,0,0,0.16)',
    textShadowRadius: 10,
    marginTop: 16,
    marginBottom: 6,
  },
  subtitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 22,
    lineHeight: 28,
    marginBottom: 16,
  },
  mediaCard: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: '#D4E6E3',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4E6E3',
    paddingHorizontal: 18,
  },
  placeholderInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mainEmojiWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 86,
    lineHeight: 96,
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  placeholderSmallEmoji: {
    fontSize: 52,
    lineHeight: 60,
  },
  placeholderText: {
    textAlign: 'center',
    color: colors.secondary,
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 16,
    lineHeight: 22,
  },
  missionName: {
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 28,
    lineHeight: 34,
    paddingHorizontal: 10,
  },
  audioToggleButton: {
    minWidth: 220,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.62)',
    marginBottom: 16,
  },
  audioToggleText: {
    color: '#FFFFFF',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 15,
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    maxWidth: 280,
    gap: 8,
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  primaryButtonText: {
    color: colors.orange,
    fontFamily: Fonts.bold,
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 28,
  },
  secondaryButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.62)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 18,
    lineHeight: 24,
  },
  footerHint: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontFamily: Fonts.semiBold,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
    marginTop: -2,
    marginBottom: 2,
  },
  pressedButton: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabledButton: {
    opacity: 0.65,
  },
});

export default StarCamMissionSuccessScreen;
