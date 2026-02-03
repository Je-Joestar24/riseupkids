/**
 * Child Home
 * Welcome card with secondary theme (#62caca)
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { parentChildService } from '@/services/parentChildService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_CHILD_KEY = '@riseupkids_selectedChild';

export default function ChildHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [child, setChild] = useState<{ displayName?: string; avatar?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const stored = await AsyncStorage.getItem(SELECTED_CHILD_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed._id === id) {
            setChild(parsed);
            setLoading(false);
            return;
          }
        }
        const res = await parentChildService.getChildById(id);
        setChild(res?.data ?? null);
      } catch {
        setChild(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleStartLearning = () => {
    if (id) router.push(`/child/${id}/explore` as never);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      {/* Welcome card - secondary theme */}
      <View style={styles.card}>
        {/* <View style={styles.avatarRow}>
          <View style={styles.avatarWrap}>
            {child?.avatar ? (
              <Image
                source={{ uri: child.avatar }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require('@/assets/images/child.png')}
                style={styles.avatarPlaceholder}
                resizeMode="contain"
              />
            )}
          </View>
          <View style={styles.greetingWrap}>
            <ThemedText style={styles.greeting}>
              Hi, {child?.displayName ?? 'Friend'}!
            </ThemedText>
            <ThemedText style={styles.subgreeting}>
              Ready to learn something awesome?
            </ThemedText>
          </View>
        </View> */}
          <View style={styles.greetingWrap}>
            <ThemedText style={styles.greeting}>
              Hi, {child?.displayName ?? 'Friend'}!
            </ThemedText>
            <ThemedText style={styles.subgreeting}>
              Ready to learn something awesome?
            </ThemedText>
          </View>
{/* 
        <Pressable
          onPress={handleStartLearning}
          style={({ pressed }) => [
            styles.startButton,
            pressed && styles.startButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Start learning">
          <MaterialIcons name="play-arrow" size={36} color={colors.textInverse} />
          <ThemedText style={styles.startButtonText}>Start Learning!</ThemedText>
        </Pressable> */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  scrollContent: {
    padding: spacing[5],
    paddingBottom: spacing[24],
    maxWidth: 848,
    width: '100%',
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.textInverse,
    padding: spacing[8],
    borderWidth: 4,
    borderColor: colors.orange,
    borderRadius: radii.none,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 96,
    height: 96,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
  },
  greetingWrap: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.sizes['3xl'],
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.secondary,
    marginBottom: spacing[1],
  },
  subgreeting: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    backgroundColor: colors.accent,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[8],
    borderRadius: radii.none,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  startButtonPressed: {
    opacity: 0.95,
  },
  startButtonText: {
    fontSize: typography.sizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
});
