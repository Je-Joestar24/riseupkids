/**
 * Child Journey – My Journey page.
 * Header, Progress Summary, and Journey Cards (completed / in progress / locked).
 */

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { JourneyCards } from '@/components/child/journey/journey-cards';
import { JourneyHeader } from '@/components/child/journey/journey-header';
import { JourneySummary } from '@/components/child/journey/journey-summary';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useJourney } from '@/hooks/journeyHook';

export default function ChildJourneyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading, error, courseProgress, coursesWithProgress } = useJourney(id);

  const step =
    courseProgress.completedCount +
    (courseProgress.inProgressCount > 0 ? 1 : 0);
  const totalSteps = Math.max(courseProgress.totalCourses, 1);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.textInverse} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, styles.container]}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <JourneyHeader week={step} totalWeeks={totalSteps} />
      {id && (
        <JourneyCards courses={coursesWithProgress} childId={id} />
      )}
      <JourneySummary
        completed={courseProgress.completedCount}
        current={courseProgress.inProgressCount}
        locked={courseProgress.lockedCount}
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
  errorText: {
    color: colors.textInverse,
    textAlign: 'center',
    padding: spacing[5],
  },
});
