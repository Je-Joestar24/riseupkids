import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useStarCam } from '@/hooks/starCamHook';

const STARCAM_BACKGROUND = require('@/assets/images/starcam_background.png');
const TEMP_BOOK = require('@/assets/images/temporary_book.png');
const TEMP_RECIPE = require('@/assets/images/temporary_recipe.png');

interface ChildStarCamProps {
  childId?: string | null;
  onSelectCategory?: (categoryKey: string) => void;
}

interface BubblePreset {
  key: string;
  title: string;
  left: number;
  top: number;
  color: string;
  iconType: 'image' | 'emoji';
  image?: ImageSourcePropType;
  emoji?: string;
}

const FALLBACK_BUBBLES: BubblePreset[] = [
  {
    key: 'reading',
    title: 'Reading Time',
    left: 40,
    top: 80,
    color: colors.orange,
    iconType: 'image',
    image: TEMP_BOOK,
  },
  {
    key: 'recipes',
    title: 'Yummy Recipes',
    left: 215,
    top: 80,
    color: '#f5c247',
    iconType: 'image',
    image: TEMP_RECIPE,
  },
  {
    key: 'nature',
    title: 'Nature Walk',
    left: 40,
    top: 280,
    color: colors.secondary,
    iconType: 'emoji',
    emoji: '🌿',
  },
  {
    key: 'sing',
    title: 'Sing Along',
    left: 215,
    top: 280,
    color: colors.orange,
    iconType: 'emoji',
    emoji: '🏠',
  },
];

const BUBBLE_SIZE = 135;
const PING_SIZE = 18;

export function ChildStarCam({ childId, onSelectCategory }: ChildStarCamProps) {
  const {
    categories,
    isLoadingCategories,
    error,
    loadCategories,
    chooseCategory,
    clearError,
  } = useStarCam();

  const pulse = useRef(new Animated.Value(1)).current;
  const ping = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulse]);

  useEffect(() => {
    const pingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ping, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(ping, {
          toValue: 0.2,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pingLoop.start();
    return () => pingLoop.stop();
  }, [ping]);

  useEffect(() => {
    if (!childId) return;
    void loadCategories(childId);
  }, [childId, loadCategories]);

  const bubbleItems = useMemo(() => {
    if (!categories.length) return FALLBACK_BUBBLES;

    return categories.slice(0, 4).map((category, index) => {
      const preset = FALLBACK_BUBBLES.find((item) => item.key === category.key);
      if (preset) {
        return {
          ...preset,
          key: category.key,
          title: category.name || preset.title,
        };
      }

      const fallbackPos = FALLBACK_BUBBLES[index % FALLBACK_BUBBLES.length];
      return {
        ...fallbackPos,
        key: category.key,
        title: category.name || category.key,
        iconType: 'emoji' as const,
        emoji: '⭐',
      };
    });
  }, [categories]);

  const handleSelectCategory = (categoryKey: string) => {
    chooseCategory(categoryKey);
    onSelectCategory?.(categoryKey);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.phoneFrame}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="map-marker-radius" size={30} color={colors.textInverse} />
          <ThemedText style={styles.headerTitle}>LET&apos;S EXPLORE</ThemedText>
        </View>

        <View style={styles.mapSection}>
          <Image
            source={STARCAM_BACKGROUND}
            style={styles.mapBackground}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          <View style={styles.bubbleArea}>
            {bubbleItems.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => handleSelectCategory(item.key)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.title}`}
                style={({ pressed }) => [
                  styles.bubblePressable,
                  { left: item.left, top: item.top },
                  pressed && styles.bubblePressed,
                ]}>
                <Animated.View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: item.color,
                      borderColor: '#fffefd',
                      transform: [{ scale: pulse }],
                      shadowColor: item.color,
                    },
                  ]}>
                  <View style={styles.bubbleInner}>
                    {item.iconType === 'image' && item.image ? (
                      <Image
                        source={item.image}
                        style={styles.bubbleImage}
                        resizeMode="contain"
                        accessibilityLabel={`${item.title} icon`}
                      />
                    ) : (
                      <ThemedText style={styles.bubbleEmoji}>{item.emoji ?? '⭐'}</ThemedText>
                    )}
                    <Animated.View
                      style={[
                        styles.pingDot,
                        {
                          opacity: ping,
                          transform: [{ scale: ping }],
                        },
                      ]}
                    />
                  </View>
                </Animated.View>
              </Pressable>
            ))}
          </View>

          {isLoadingCategories ? (
            <View style={styles.statusWrap} pointerEvents="box-none">
              <ActivityIndicator size="small" color={colors.accent} />
              <ThemedText style={styles.statusText}>Loading categories...</ThemedText>
            </View>
          ) : null}

          {error ? (
            <Pressable
              onPress={clearError}
              accessibilityRole="button"
              accessibilityLabel="Dismiss category loading error"
              style={styles.errorWrap}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Tap a bubble to start your adventure!
          </ThemedText>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default ChildStarCam;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.accent,
    padding: spacing[3],
    paddingLeft: 0,
    paddingRight: 0
  },
  phoneFrame: {
    flex: 1,
    flexDirection: 'column',
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: colors.accent,
    backgroundColor: '#fff',
    shadowColor: '#000',
  },
  header: {
    height: 80,
    backgroundColor: colors.accent,
    borderBottomWidth: 4,
    borderBottomColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[2],
  },
  headerTitle: {
    color: colors.textInverse,
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  /** Fills space between header and footer so the cover image can span full height. */
  mapSection: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    backgroundColor: colors.bgSecondary,
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  bubbleArea: {
    ...StyleSheet.absoluteFillObject,
  },
  bubblePressable: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
  },
  bubblePressed: {
    opacity: 0.88,
  },
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  bubbleInner: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bubbleImage: {
    width: 106,
    height: 106,
  },
  bubbleEmoji: {
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '700',
  },
  pingDot: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: PING_SIZE,
    height: PING_SIZE,
    borderRadius: PING_SIZE / 2,
    backgroundColor: '#fff',
  },
  statusWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    zIndex: 20,
  },
  statusText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  errorWrap: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[12],
    alignSelf: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: radii.md,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    zIndex: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    minHeight: 64,
    backgroundColor: colors.accent,
    borderTopWidth: 4,
    borderTopColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
  },
  footerText: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
});
