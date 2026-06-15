/**
 * Kid's Wall skeletal loading — post card placeholders.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

const SKELETON_CARD_COUNT = 2;

function SkeletonBone({ style }: { style?: StyleProp<ViewStyle> }) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return <Animated.View style={[styles.bone, style, { opacity: pulse }]} />;
}

function WallCardSkeleton({ imageSize }: { imageSize: number }) {
  return (
    <View style={styles.card}>
      <SkeletonBone style={{ width: imageSize, height: imageSize, borderRadius: 0 }} />
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <SkeletonBone style={styles.avatarBone} />
          <View style={styles.nameWrap}>
            <SkeletonBone style={styles.nameBone} />
            <SkeletonBone style={styles.ageBone} />
          </View>
        </View>
        <SkeletonBone style={styles.titleBone} />
        <SkeletonBone style={styles.contentBone} />
        <SkeletonBone style={styles.contentBoneShort} />
        <View style={styles.actions}>
          <SkeletonBone style={styles.likeBone} />
          <SkeletonBone style={styles.greatBone} />
        </View>
      </View>
    </View>
  );
}

export function WallCardsSkeleton({ count = SKELETON_CARD_COUNT }: { count?: number }) {
  const { width } = useWindowDimensions();
  const imageSize = width;

  return (
    <View
      style={styles.list}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading wall posts">
      {Array.from({ length: count }).map((_, index) => (
        <WallCardSkeleton key={`wall-card-skeleton-${index}`} imageSize={imageSize} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 4,
  },
  list: {
    gap: spacing[6],
    marginBottom: spacing[8],
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  body: {
    padding: spacing[4],
    gap: spacing[2],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[1],
  },
  avatarBone: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  nameWrap: {
    flex: 1,
    gap: spacing[1],
  },
  nameBone: {
    width: '55%',
    height: 14,
  },
  ageBone: {
    width: '35%',
    height: 12,
  },
  titleBone: {
    width: '80%',
    height: 18,
    marginBottom: spacing[1],
  },
  contentBone: {
    width: '100%',
    height: 14,
  },
  contentBoneShort: {
    width: '72%',
    height: 14,
    marginBottom: spacing[2],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  likeBone: {
    width: 56,
    height: 28,
  },
  greatBone: {
    width: 80,
    height: 28,
  },
});
