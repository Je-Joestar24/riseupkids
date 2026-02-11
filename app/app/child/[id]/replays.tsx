/**
 * Child Replays screen (Explore → View all replays)
 * No nested routes; sibling to explore.
 */

import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ReplaysCards } from '@/components/child/replays/replays-cards';
import { ReplaysFooter } from '@/components/child/replays/replays-footer';
import { ReplaysHeader } from '@/components/child/replays/replays-header';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';

export default function ChildReplaysScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <ReplaysHeader childId={id} />
        <View style={{ height: spacing[6] }} />
        <ReplaysCards childId={id} />
        <View style={{ height: spacing[8] }} />s
        <ReplaysFooter />
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
