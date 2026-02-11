/**
 * Explore Content (videos by type) – one generic screen driven by route params.
 * Sibling to explore (no nested routes). URL: /child/[id]/explore-content?videoType=...
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ContentsCards } from '@/components/child/contents/contents-cards';
import { ContentsFooter } from '@/components/child/contents/contents-footer';
import { ContentsHeader } from '@/components/child/contents/contents-header';
import { ContentsShare } from '@/components/child/contents/contents-share';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { VIDEO_TYPE_VALUES } from '@/constants/explore';

export default function ChildExploreContentScreen() {
  const { id, videoType } = useLocalSearchParams<{ id: string; videoType: string }>();
  const router = useRouter();
  const childId = id ?? '';
  const type = (videoType ?? '').trim();

  const isValidType = type && VIDEO_TYPE_VALUES.includes(type as (typeof VIDEO_TYPE_VALUES)[number]);

  useEffect(() => {
    if (childId && !isValidType) {
      router.replace(`/child/${childId}/explore` as never);
    }
  }, [childId, isValidType, router]);

  if (!childId) return null;
  if (!isValidType) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <ContentsHeader childId={childId} videoType={type} />
        <View style={{ height: spacing[6] }} />
        <ContentsShare childId={childId} videoType={type} />
        <View style={{ height: spacing[6] }} />
        <ContentsCards childId={childId} videoType={type} />
        <View style={{ height: spacing[6] }} />
        <ContentsFooter videoType={type} />
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
