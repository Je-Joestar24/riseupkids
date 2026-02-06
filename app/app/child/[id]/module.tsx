/**
 * Module (course detail) screen – opened from a journey card.
 * Sibling route to journey (not a child); footer still shows "My Journey" active.
 * courseId is passed via query: /child/[id]/module?courseId=...
 */

import { useGlobalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AudioModal } from '@/components/child/common/audio-modal';
import { ChantModal } from '@/components/child/common/chant-modal';
import { VideoPlayerModal } from '@/components/child/common/video-player-modal';
import { ModuleAudioAssignments } from '@/components/child/module/module-audio-assignments';
import { ModuleBooks } from '@/components/child/module/module-books';
import { ModuleBreadcrumbs } from '@/components/child/module/module-breadcrumbs';
import { ModuleChants } from '@/components/child/module/module-chants';
import { ModuleFooter } from '@/components/child/module/module-footer';
import { ModuleHeader } from '@/components/child/module/module-header';
import { ModuleProgress } from '@/components/child/module/module-progress';
import { getCoverImageUrl } from '@/components/child/module/module-utils';
import { ModuleVideos } from '@/components/child/module/module-videos';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useModule } from '@/hooks/moduleHook';
import type { PopulatedContentItem } from '@/services/moduleService';

function getContentId(item: PopulatedContentItem): string {
  return String(item._contentId ?? item._id ?? '');
}

export default function ChildModuleScreen() {
  const { id: childId, courseId } = useGlobalSearchParams<{
    id?: string;
    courseId?: string;
  }>();
  const [videoModal, setVideoModal] = useState<PopulatedContentItem | null>(null);
  const [chantModal, setChantModal] = useState<PopulatedContentItem | null>(null);
  const [audioModal, setAudioModal] = useState<PopulatedContentItem | null>(null);

  const {
    course,
    progressSummary,
    books,
    videos,
    chants,
    audioAssignments,
    bookReadingsByBookId,
    videoWatchesByVideoId,
    isLoading,
    error,
    fetchModuleDetails,
    clearModule,
    refreshVideoWatches,
    getBookProgressCircles,
    isBookCompleted,
    getVideoProgressCircles,
    isVideoCompleted,
    isChantCompleted,
    getAudioStatus,
  } = useModule();

  const getBookStarPoints = (book: PopulatedContentItem) =>
    (bookReadingsByBookId[getContentId(book)] as { starsAwarded?: boolean } | undefined)?.starsAwarded ? 1 : 0;
  const getVideoStarPoints = (video: PopulatedContentItem) =>
    (videoWatchesByVideoId[getContentId(video)] as { starsAwarded?: boolean } | undefined)?.starsAwarded ? 1 : 0;
  const getChantStarPoints = (chant: PopulatedContentItem) =>
    isChantCompleted(chant) ? 1 : 0;

  const fetch = useCallback(() => {
    if (courseId && childId) {
      fetchModuleDetails(courseId, childId);
    }
  }, [courseId, childId, fetchModuleDetails]);

  useEffect(() => {
    fetch();
    return () => {
      clearModule();
    };
  }, [fetch, clearModule]);

  if (!childId || !courseId) {
    return (
      <View style={[styles.centered, styles.container]}>
        <ThemedText style={styles.errorText}>Missing child or course.</ThemedText>
      </View>
    );
  }

  if (isLoading && !course) {
    return (
      <View style={[styles.centered, styles.container]}>
        <ActivityIndicator size="large" color={colors.textInverse} />
      </View>
    );
  }

  if (error && !course) {
    return (
      <View style={[styles.centered, styles.container]}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </View>
    );
  }

  if (!course) {
    return null;
  }

  const stepNumber = course.stepOrder ?? 1;
  // API returns coverImage (e.g. /uploads/courses/xxx.jpeg); fallback to coverImagePath
  const coverUrl = getCoverImageUrl(course.coverImage ?? course.coverImagePath ?? undefined);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <ModuleHeader
        stepNumber={stepNumber}
        childId={childId}
        coverImageUrl={coverUrl}
        courseTitle={course.title ?? 'Course'}
      />
      <ModuleBreadcrumbs stepNumber={stepNumber} childId={childId} />
      <ModuleProgress
        courseTitle={course.title ?? 'Course Title'}
        courseDescription={course.description ?? undefined}
        completedCount={progressSummary.completedCount}
        todoCount={progressSummary.todoCount}
        lockedCount={progressSummary.lockedCount}
        totalCount={progressSummary.totalCount}
      />
      <ModuleVideos
        videos={videos}
        getProgressCircles={getVideoProgressCircles}
        isCompleted={isVideoCompleted}
        getStarPoints={getVideoStarPoints}
        onVideoPress={(v) => setVideoModal(v)}
      />
      <ModuleBooks
        books={books}
        getProgressCircles={getBookProgressCircles}
        isCompleted={isBookCompleted}
        getStarPoints={getBookStarPoints}
      />
      <ModuleChants
        chants={chants}
        isCompleted={isChantCompleted}
        getStarPoints={getChantStarPoints}
        onChantPress={(c) => setChantModal(c)}
      />
      <ModuleAudioAssignments
        audioAssignments={audioAssignments}
        getStatus={(audio) => getAudioStatus(audio) as 'not_started' | 'in_progress' | 'completed' | 'rejected' | null}
        getStarPoints={() => 0}
        onAudioPress={(a) => setAudioModal(a)}
      />
      <ModuleFooter />

      <VideoPlayerModal
        open={Boolean(videoModal)}
        onClose={() => setVideoModal(null)}
        video={videoModal}
        childId={childId ?? null}
        courseId={courseId ?? null}
        onVideoComplete={() => {
          if (childId) refreshVideoWatches(childId);
          fetchModuleDetails(courseId!, childId!);
          setVideoModal(null);
        }}
      />
      <ChantModal
        open={Boolean(chantModal)}
        onClose={() => setChantModal(null)}
        chant={chantModal}
        childId={childId ?? null}
        courseId={courseId ?? null}
        onAfterComplete={() => {
          fetchModuleDetails(courseId!, childId!);
        }}
      />
      <AudioModal
        open={Boolean(audioModal)}
        onClose={() => setAudioModal(null)}
        audioAssignment={audioModal}
        childId={childId ?? null}
        courseId={courseId ?? null}
        onAfterApproved={() => {
          fetchModuleDetails(courseId!, childId!);
        }}
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
