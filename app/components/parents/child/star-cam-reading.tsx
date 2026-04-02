/**
 * Star Cam — Reading category mission picker
 *
 * Full screen UI (Figma Reading missions) + data from `useStarCamReadingMissions`.
 * Mission bubbles are driven by `mapBubbles` (API-ready, up to 3 slots).
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useStarCamReadingMissions } from '@/hooks/starCamHook';
import type { StarCamMissionMapBubble } from '@/services/childStarCamService';

export type StarCamMapMissionItem = StarCamMissionMapBubble;

/** Temporary demo missions — replace with `mapBubbles` from API when ready. */
export const SAMPLE_READING_MISSIONS: StarCamMissionMapBubble[] = [
  { id: 'sample-reading-1', missionId: 'sample-reading-1', title: 'Story one', emoji: '📖' },
  { id: 'sample-reading-2', missionId: 'sample-reading-2', title: 'Story two', emoji: '📚' },
  { id: 'sample-reading-3', missionId: 'sample-reading-3', title: 'Story three', emoji: '🎧' },
];

const READING_GRADIENT = ['#fde8de', '#f5c7b8', colors.orange] as const;
const READING_TOP_SHADE = 'rgba(253, 232, 222, 0.92)';

/** One full drift loop for background decor translation. */
function getLeafMotionCycleMs(seed: number) {
  return 9000 + seed * 1000;
}

/** Spin vs base drift period: 2.25× = two ×50% slowdowns stacked (calmer rotation). */
const DECOR_SPIN_DURATION_MULTIPLIER = 2.25;

const READING_DECOR: Array<{ emoji: string; style: StyleProp<ViewStyle> }> = [
  { emoji: '📕', style: { top: '38%', left: 20, opacity: 0.3 } },
  { emoji: '📘', style: { top: '50%', right: 30, opacity: 0.3 } },
  { emoji: '⭐', style: { top: '17%', right: 30, opacity: 0.3 } },
];

const MISSION_SLOTS: Array<{
  leftPct: number;
  topPct: number;
  size: number;
  delayMs: number;
  /** 135°-style peach / coral stops (Figma Reading mission bubbles). */
  gradientColors: readonly [string, string, string];
  shadowColor: string;
}> = [
  {
    leftPct: 50,
    topPct: 28.44,
    size: 140,
    delayMs: 0,
    gradientColors: ['#f4a28c', '#f5a98a', '#e98a68'],
    shadowColor: 'rgb(244, 162, 140)',
  },
  {
    leftPct: 42.31,
    topPct: 48.58,
    size: 130,
    delayMs: 400,
    gradientColors: ['#ffd4b8', '#ffc5a1', '#ffb090'],
    shadowColor: 'rgb(255, 197, 161)',
  },
  {
    leftPct: 50,
    topPct: 67.54,
    size: 130,
    delayMs: 800,
    gradientColors: ['#f5a98a', '#e98a68', '#d87356'],
    shadowColor: colors.orange,
  },
];

function useFloater(delayMs: number) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(y, {
          toValue: -8,
          duration: 1500,
          delay: delayMs,
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delayMs, y]);
  return y;
}

function useLeafMotion(seed: number) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const duration = getLeafMotionCycleMs(seed);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: duration / 4, useNativeDriver: true }),
        Animated.timing(t, { toValue: 2, duration: duration / 4, useNativeDriver: true }),
        Animated.timing(t, { toValue: 3, duration: duration / 4, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: duration / 4, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [seed, t]);

  const translateX = t.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, -15, 0, 15],
  });
  const translateY = t.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, 20, 40, 20],
  });
  return { translateX, translateY };
}

/**
 * Full 360° forward for half the spin cycle, then 360° back — looped, linear.
 * Cycle is longer than `useLeafMotion` by `DECOR_SPIN_DURATION_MULTIPLIER` so the turn reads calmer.
 */
function useDecorSpin360(seed: number) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = getLeafMotionCycleMs(seed) * DECOR_SPIN_DURATION_MULTIPLIER;
    const half = duration / 2;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(spin, {
          toValue: 1,
          duration: half,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(spin, {
          toValue: 0,
          duration: half,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [seed, spin]);

  return spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
}

function MissionBubble({
  item,
  size,
  delayMs,
  gradientColors,
  shadowColor,
  onPress,
}: {
  item: StarCamMapMissionItem;
  size: number;
  delayMs: number;
  gradientColors: readonly [string, string, string];
  shadowColor: string;
  onPress: () => void;
}) {
  const floatY = useFloater(delayMs);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        mapStyles.missionWrap,
        {
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          transform: [{ translateY: floatY }],
        },
      ]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Start mission ${item.title}`}
        style={({ pressed }) => [pressed && mapStyles.missionPressed]}>
        <Animated.View
          style={[
            mapStyles.missionBubbleOuter,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ scale: pulse }],
              shadowColor,
            },
          ]}>
          <LinearGradient
            colors={[gradientColors[0], gradientColors[1], gradientColors[2]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: size - 16,
              height: size - 16,
              borderRadius: (size - 16) / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <ThemedText style={[mapStyles.missionEmoji, { fontSize: size * 0.5 }]}>{item.emoji}</ThemedText>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function DecorEmoji({ emoji, style, seed }: { emoji: string; style: StyleProp<ViewStyle>; seed: number }) {
  const { translateX, translateY } = useLeafMotion(seed);
  const rotate = useDecorSpin360(seed);

  return (
    <Animated.View
      style={[
        mapStyles.decorEmoji,
        style,
        {
          transform: [{ translateX }, { translateY }, { rotate }],
        },
      ]}>
      <ThemedText style={mapStyles.decorEmojiText}>{emoji}</ThemedText>
    </Animated.View>
  );
}

function ReadingMissionMap({
  onBack,
  missions,
  onMissionPress,
  footerHint,
}: {
  onBack: () => void;
  missions: StarCamMapMissionItem[];
  onMissionPress: (item: StarCamMapMissionItem) => void;
  footerHint: string;
}) {
  const [mapSize, setMapSize] = useState({ w: 0, h: 0 });

  const onMapLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setMapSize({ w: width, h: height });
  };

  const visibleMissions = useMemo(() => missions.slice(0, MISSION_SLOTS.length), [missions]);

  const pathD = useMemo(() => {
    if (mapSize.w < 1 || mapSize.h < 1) return '';
    const sx = mapSize.w / 390;
    const sy = mapSize.h / 844;
    return `M ${195 * sx} ${255 * sy} Q ${165 * sx} ${330 * sy}, ${195 * sx} ${410 * sy} Q ${220 * sx} ${490 * sy}, ${195 * sx} ${570 * sy}`;
  }, [mapSize]);

  return (
    <View style={mapStyles.root}>
      <LinearGradient
        colors={[...READING_GRADIENT]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={mapStyles.screenGradient}
      />
      <View style={[mapStyles.gradientOverlay, { backgroundColor: READING_GRADIENT[0] }]} pointerEvents="none" />
      {/* <View style={mapStyles.radialGlow} pointerEvents="none" /> */}

      <View style={mapStyles.decorLayer} pointerEvents="none">
        {READING_DECOR.map((d, i) => (
          <DecorEmoji key={`${d.emoji}-${i}`} emoji={d.emoji} style={d.style} seed={i} />
        ))}
      </View>
{/* 
      <View style={[mapStyles.topFade, { backgroundColor: READING_TOP_SHADE }]} pointerEvents="none" /> */}

      <Pressable
        onPress={onBack}
        style={[mapStyles.backBtn, { backgroundColor: colors.orange }]}
        accessibilityRole="button"
        accessibilityLabel="Go back">
        <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textInverse} />
      </Pressable>

      <View style={mapStyles.headerRow}>
        <ThemedText style={mapStyles.headerTitle}>📚 Reading Time</ThemedText>
      </View>

      <View style={mapStyles.mapArea} onLayout={onMapLayout}>
        {pathD ? (
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Path d={pathD} stroke="#FFFFFF" strokeWidth={3} strokeDasharray="8 8" fill="none" opacity={0.5} />
          </Svg>
        ) : null}

        {visibleMissions.map((item, index) => {
          const slot = MISSION_SLOTS[index];
          if (!slot) return null;
          return (
            <View
              key={item.id}
              style={[
                mapStyles.missionAnchor,
                {
                  left: `${slot.leftPct}%`,
                  top: `${slot.topPct}%`,
                },
              ]}>
              <MissionBubble
                item={item}
                size={slot.size}
                delayMs={slot.delayMs}
                gradientColors={slot.gradientColors}
                shadowColor={slot.shadowColor}
                onPress={() => onMissionPress(item)}
              />
            </View>
          );
        })}
      </View>

      <View style={mapStyles.footerWrap}>
        <ThemedText style={[mapStyles.footerHint, { color: 'rgba(255,255,255,0.9)' }]}>{footerHint}</ThemedText>
      </View>
    </View>
  );
}

export interface StarCamReadingProps {
  childId: string | null;
  onBack: () => void;
  onMissionPress?: (item: StarCamMapMissionItem) => void;
}

export function StarCamReading({ childId, onBack, onMissionPress }: StarCamReadingProps) {
  const { mapBubbles, selectMissionForFlow } = useStarCamReadingMissions(childId);

  const displayMissions = SAMPLE_READING_MISSIONS;

  const handleMission = useCallback(
    async (item: StarCamMapMissionItem) => {
      const isSample = item.missionId.startsWith('sample-reading');
      if (!isSample && childId) {
        await selectMissionForFlow(item.missionId);
      }
      onMissionPress?.(item);
    },
    [onMissionPress, selectMissionForFlow, childId]
  );

  const footer =
    mapBubbles.length === 0
      ? 'Tap a story to begin reading'
      : 'Tap a story to begin reading';

  return (
    <SafeAreaView style={styles.safeRoot} edges={['top', 'right', 'bottom', 'left']}>
      <View style={styles.phoneFrame}>
        <ReadingMissionMap
          onBack={onBack}
          missions={displayMissions}
          onMissionPress={handleMission}
          footerHint={footer}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /** Matches `ChildStarCam`: inset from device safe areas, then yellow “display” frame. */
  safeRoot: {
    flex: 1,
    backgroundColor: colors.orange,
    padding: spacing[3],
    paddingLeft: 0,
    paddingRight: 0,
  },
  phoneFrame: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: colors.orange,
    backgroundColor: colors.bgLogin,
  },
});

const mapStyles = StyleSheet.create({
  /** Fills the yellow phone frame; border is on the parent `phoneFrame`. */
  root: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  screenGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
  },
//   radialGlow: {
//     position: 'absolute',
//     width: 300,
//     height: 300,
//     borderRadius: 150,
//     backgroundColor: 'rgba(255,255,255,0.18)',
//     left: '50%',
//     top: '50%',
//     marginLeft: -150,
//     marginTop: -150,
//     opacity: 0.9,
//   },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  decorEmoji: {
    position: 'absolute',
  },
  decorEmojiText: {
    fontSize: 56,
    fontWeight: '600',
    lineHeight: 60,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: 'transparent',
  },
  backBtn: {
    position: 'absolute',
    left: spacing[4],
    top: spacing[4],
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  headerRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: typography.sizes['4xl'],
    fontWeight: '700',
    color: colors.textInverse,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    lineHeight: 60,
  },
  mapArea: {
    flex: 1,
    marginTop: 140,
    position: 'relative',
  },
  missionAnchor: {
    position: 'absolute',
    zIndex: 20,
  },
  missionWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionPressed: {
    opacity: 0.92,
  },
  missionBubbleOuter: {
    padding: 8,
    backgroundColor: '#fff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 22,
    elevation: 12
  },
  missionEmoji: {
    fontWeight: '700',
    lineHeight: 80,
  },
  footerWrap: {
    position: 'absolute',
    bottom: spacing[12],
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  footerHint: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
