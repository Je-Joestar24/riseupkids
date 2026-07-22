/**
 * Child Header Navigation
 * Two columns: (1) flex area with logo centered in the left side, (2) points button sized to content
 * Total stars are read from exploreStore (single source of truth).
 * Initial load fetches once; subsequent rewards update locally via applyChildStarReward.
 */

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useExploreStore } from '@/store/exploreStore';

interface HeaderNavProps {
  childId: string;
}

export function HeaderNav({ childId }: HeaderNavProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const totalStars = useExploreStore((s) => (childId ? s.childTotalStars[childId] : undefined));
  const fetchChildTotalStars = useExploreStore((s) => s.fetchChildTotalStars);

  useEffect(() => {
    if (!childId) return;
    if (totalStars === undefined) {
      fetchChildTotalStars(childId);
    }
  }, [childId, totalStars, fetchChildTotalStars]);

  const handlePointsPress = () => {
    router.push(`/child/${childId}/profile` as never);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.toolbar}>
        {/* Column 1: takes all space, logo centered within it */}
        <View style={styles.logoColumn}>
          <Image
            source={require('@/assets/images/small-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Rise Up Kids Logo"
          />
        </View>

        {/* Column 2: only as wide as its contents */}
        <Pressable
          onPress={handlePointsPress}
          style={({ pressed }) => [styles.pointsButton, pressed && styles.pointsButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Points">
          <ThemedText style={styles.starEmoji}>⭐</ThemedText>
          <ThemedText style={styles.pointsText}>{totalStars ?? 0}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.textInverse,
    minHeight: 100,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    minHeight: 100,
  },
  logoColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    height: 75,
  },
  pointsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.orange,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: 0,
  },
  pointsButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 1.02 }],
  },
  starEmoji: {
    fontSize: typography.sizes['2xl'],
  },
  pointsText: {
    fontFamily: 'Quicksand_700Bold',
    fontSize: typography.sizes['2xl'],
    color: colors.textInverse,
  },
});
