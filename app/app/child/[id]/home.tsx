/**
 * Child Home
 * Sections:
 * - Start learning (sample.png)
 * - Live class (YouTube + meeting)
 * - Accumulated stats
 */

import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AccumulateStat } from '@/components/child/home/accumulate-stat';
import { LiveClasses } from '@/components/child/home/live-classes';
import { StartLearning } from '@/components/child/home/start-learning';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useHomeData } from '@/hooks/homeHook';
import { parentChildService } from '@/services/parentChildService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_CHILD_KEY = '@riseupkids_selectedChild';

export default function ChildHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [child, setChild] = useState<{
    _id?: string;
    displayName?: string;
    avatar?: string | null;
    stats?: { currentStreak?: number; totalBadges?: number; badges?: unknown[]; totalStars?: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const homeData = useHomeData(id);

  useFocusEffect(
    useCallback(() => {
      homeData.refresh();
    }, [homeData.refresh])
  );

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
      <StartLearning displayName={child?.displayName} onStartLearning={handleStartLearning} />

      <LiveClasses loading={homeData.loading} nextMeeting={homeData.nextMeeting} activeLive={homeData.activeLive} />

      <AccumulateStat
        dayStreak={child?.stats?.currentStreak ?? 0}
        badges={
          child?.stats?.totalBadges ??
          (Array.isArray(child?.stats?.badges) ? child!.stats!.badges!.length : 0)
        }
        totalStars={homeData.totalStars || child?.stats?.totalStars || 0}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    padding: spacing[5],
    paddingBottom: spacing[24],
    maxWidth: 848,
    width: '100%',
    alignSelf: 'center',
    gap: spacing[4],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
