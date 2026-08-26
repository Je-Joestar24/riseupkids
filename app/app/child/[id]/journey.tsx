/**
 * Child Journey – My Journey page.
 * Header, Progress Summary, and Journey Cards (completed / in progress / locked).
 */

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { JourneyCards } from '@/components/child/journey/journey-cards';
import { JourneyHeader } from '@/components/child/journey/journey-header';
import { JourneySkeletalLoading } from '@/components/child/journey/journey-skeletal-loading';
import { JourneySummary } from '@/components/child/journey/journey-summary';
import { ChildNetworkRetry } from '@/components/child/common/child-network-retry';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useJourney } from '@/hooks/journeyHook';
import { isNetworkError } from '@/utils/networkError';

export default function ChildJourneyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading, error, courseProgress, coursesWithProgress, refresh } = useJourney(id);

  // Background refresh on focus so admin lock/unlock updates without a skeleton flash
  useFocusEffect(
    React.useCallback(() => {
      void refresh({ silent: true });
    }, [refresh])
  );

  const step =
    courseProgress.completedCount +
    (courseProgress.inProgressCount > 0 ? 1 : 0);
  const totalSteps = Math.max(courseProgress.totalCourses, 1);

  if (error && !loading && coursesWithProgress.length === 0) {
    if (isNetworkError(error)) {
      return (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <JourneySkeletalLoading />
        </ScrollView>
      );
    }
    return (
      <View style={[styles.centered, styles.container]}>
        <ChildNetworkRetry
          title="Could not load"
          message={error}
          retrying={loading}
          onRetry={() => {
            void refresh({ silent: false });
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      {loading ? (
        <JourneySkeletalLoading />
      ) : (
        <>
          <JourneyHeader week={step} totalWeeks={totalSteps} />
          {id ? <JourneyCards courses={coursesWithProgress} childId={id} /> : null}
          <JourneySummary
            completed={courseProgress.completedCount}
            current={courseProgress.inProgressCount}
            locked={courseProgress.lockedCount}
          />
        </>
      )}
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
