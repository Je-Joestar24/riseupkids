/**
 * Child Explore
 * Star Cam, Watch Replays, What Do You Want to Learn?, Video collections
 */

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ExploreReplays } from '@/components/child/explore/explore-replays';
import { ExploreSomething } from '@/components/child/explore/explore-something';
import { ExploreStarCam } from '@/components/child/explore/explore-starcam';
import { ExploreVideoCollection } from '@/components/child/explore/explore-video-collection';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

export default function ChildExploreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const childId = id ?? null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <ExploreReplays childId={childId} />
        <ExploreSomething />
        <ExploreVideoCollection childId={childId} />
        <ExploreStarCam />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[12],
  },
});
