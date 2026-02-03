/**
 * Child Header Navigation
 * Sticky header: centered logo, points (stars) button on right
 * Follows web ChilHeader design
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_CHILD_KEY = '@riseupkids_selectedChild';
const CHILD_PROFILES_KEY = '@riseupkids_childProfiles';

interface HeaderNavProps {
  childId: string;
}

export function HeaderNav({ childId }: HeaderNavProps) {
  const router = useRouter();
  const [totalStars, setTotalStars] = useState(0);

  const fetchStars = async () => {
    try {
      const [childData, profilesRaw] = await Promise.all([
        AsyncStorage.getItem(SELECTED_CHILD_KEY),
        AsyncStorage.getItem(CHILD_PROFILES_KEY),
      ]);

      const child = childData ? JSON.parse(childData) : null;
      const profiles = profilesRaw ? JSON.parse(profilesRaw) : [];

      const source = child?.stats ? child : profiles.find((c: { _id: string }) => c._id === childId);
      setTotalStars(source?.stats?.totalStars ?? 0);
    } catch {
      setTotalStars(0);
    }
  };

  useEffect(() => {
    fetchStars();
  }, [childId]);

  const handlePointsPress = () => {
    router.push(`/child/${childId}/profile` as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        {/* Logo - centered */}
        <View style={styles.logoWrap}>
          <Image
            source={require('@/assets/images/small-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Rise Up Kids Logo"
          />
        </View>

        {/* Right: Points button */}
        <Pressable
          onPress={handlePointsPress}
          style={({ pressed }) => [styles.pointsButton, pressed && styles.pointsButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Points">
          <ThemedText style={styles.starEmoji}>⭐</ThemedText>
          <ThemedText style={styles.pointsText}>{totalStars}</ThemedText>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    minHeight: 100,
  },
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  logo: {
    height: 88,
    width: 120,
  },
  pointsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.orange,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: 0,
    marginLeft: 'auto',
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
