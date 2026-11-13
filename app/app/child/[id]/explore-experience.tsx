/**
 * Child Experience list (Explore → Experience)
 * Every published experience with its cover picture. Sibling of explore (like replays), named so the
 * footer keeps "Explore" lit (the path contains /explore).
 */

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ExperienceCards } from '@/components/child/experiences/experience-cards';
import { ExperiencesHeader } from '@/components/child/experiences/experiences-header';
import { spacing } from '@/config/theme/spacing';

export default function ChildExploreExperienceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <ExperiencesHeader childId={id} />
        <View style={{ height: spacing[6] }} />
        <ExperienceCards childId={id} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDE8DE',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[12],
  },
});
