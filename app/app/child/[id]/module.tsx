/**
 * Module (course detail) screen – opened from a journey card.
 * Sibling route to journey (not a child); footer still shows "My Journey" active.
 * courseId is passed via query: /child/[id]/module?courseId=...
 */

import { useGlobalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AudioModal } from '@/components/child/common/audio-modal';
import { ChantModal } from '@/components/child/common/chant-modal';
import {
  CmsCompletionDialog,
  type CmsCompletionDialogData,
} from '@/components/child/common/cms-completion-dialog';
import {
  CmsPlayerModal,
  lockLandscapeForCmsBookPlayer,
  type CmsSessionPayload,
} from '@/components/child/common/cms-player-modal';
import { Html5Modal } from '@/components/child/common/html5-modal';
import { VideoPlayerModal } from '@/components/child/common/video-player-modal';
import { ModuleAudioAssignments } from '@/components/child/module/module-audio-assignments';
import { ModuleBooks } from '@/components/child/module/module-books';
import { ModuleBreadcrumbs } from '@/components/child/module/module-breadcrumbs';
import { ModuleChants } from '@/components/child/module/module-chants';
import { ModuleFooter } from '@/components/child/module/module-footer';
import { ModuleHeader } from '@/components/child/module/module-header';
import { ModuleProgress } from '@/components/child/module/module-progress';
import {
  getBuiltinCmsBookId,
  getCoverImageUrl,
  getLinkedCmsBookId,
  isBuiltinCmsVideoFollowUp,
  isHtml5VideoFollowUp,
  isBuiltinCmsBook,
} from '@/components/child/module/module-utils';
import { ModuleVideos } from '@/components/child/module/module-videos';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useCmsBookPlayer } from '@/hooks/cmsBookPlayerHook';
import { useCmsPlayerStore } from '@/store/cmsPLayerStore';
import { useHtml5Modal, isHtml5Book } from '@/hooks/html5Hook';
import { useModule } from '@/hooks/moduleHook';
import type { BuiltInBookCompletionPayload } from '@/services/cmsBooksPlayerService';
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
  const [cmsModalBook, setCmsModalBook] = useState<PopulatedContentItem | null>(null);
  const [cmsModalSource, setCmsModalSource] = useState<'book' | 'videoFollowUp'>('book');
  const [cmsCompletionOpen, setCmsCompletionOpen] = useState(false);
  const [cmsCompletionData, setCmsCompletionData] = useState<CmsCompletionDialogData | null>(null);

  const {
    open: html5Open,
    selectedBook: html5Book,
    openModal: openHtml5Modal,
    closeModal: closeHtml5Modal,
    launchUrl: html5LaunchUrl,
    loading: html5Loading,
    error: html5Error,
  } = useHtml5Modal();

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
    updateContentProgress,
    getBookProgressCircles,
    isBookCompleted,
    getVideoProgressCircles,
    isVideoCompleted,
    isChantCompleted,
    getAudioStatus,
  } = useModule();

  const {
    selectedBook: cmsPlayableBook,
    openBook: openCmsPlayableBook,
    resetPlayer: resetCmsPlayer,
    submitScore: submitBuiltinBookScore,
    isLoadingBook: isCmsBookLoading,
  } = useCmsBookPlayer({
    childId: childId ?? null,
    courseId: courseId ?? null,
  });

  const mapCmsSessionToCompletion = useCallback(
    (payload: CmsSessionPayload): BuiltInBookCompletionPayload => {
      const maxScore = Math.max(0, payload.maxScore);
      const score = Math.min(payload.score, maxScore > 0 ? maxScore : payload.score);
      const ratio = maxScore > 0 ? score / maxScore : 1;
      const passedRatio = ratio >= 0.75;
      const fullMarks = maxScore > 0 && score >= maxScore;
      const progress = fullMarks
        ? 100
        : passedRatio
          ? Math.max(80, Math.round(ratio * 100))
          : Math.min(100, Math.round(ratio * 100));
      return {
        score: maxScore > 0 ? score : 1,
        maxScore: maxScore > 0 ? maxScore : 1,
        status: passedRatio || fullMarks ? 'passed' : 'completed',
        timeSpent: Math.max(1, payload.attemptCount * 5 + (payload.trigger === 'home' ? 30 : 5)),
        progress,
      };
    },
    []
  );

  const handleCmsSessionComplete = useCallback(
    async (payload: CmsSessionPayload) => {
      if (!cmsModalBook || !childId || !courseId) return;
      if (cmsModalSource === 'videoFollowUp') {
        await fetchModuleDetails(courseId, childId);
        return;
      }
      const libraryBookId = getContentId(cmsModalBook);
      const maxScore = Math.max(0, payload.maxScore);
      const score = Math.min(payload.score, maxScore > 0 ? maxScore : payload.score);
      const ratio = maxScore > 0 ? score / maxScore : 1;
      const worthSubmitting =
        ratio >= 0.75
        || (maxScore > 0 && score >= maxScore)
        || maxScore === 0
        || payload.trigger === 'home';
      if (!worthSubmitting) return;

      const body = mapCmsSessionToCompletion(payload);
      const completionRes = await submitBuiltinBookScore(libraryBookId, body);
      if (completionRes?.success) {
        await updateContentProgress(courseId, childId, libraryBookId, 'book');
      }
      await fetchModuleDetails(courseId, childId);

      if (payload.trigger === 'home') {
        const raw = completionRes?.data;
        const apiData =
          raw && typeof raw === 'object' && !Array.isArray(raw)
            ? (raw as Record<string, unknown>)
            : {};
        setCmsCompletionData({
          score,
          maxScore,
          attemptCount: payload.attemptCount,
          starsAwarded: Boolean(apiData.starsAwarded),
          starsToAward: Number(apiData.starsToAward) || 0,
          totalStars:
            apiData.totalStars !== undefined && apiData.totalStars !== null
              ? Number(apiData.totalStars)
              : undefined,
          readingCount: Number(apiData.readingCount) || 0,
          requiredReadingCount: Number(apiData.requiredReadingCount) || 5,
          requirementMet: Boolean(apiData.requirementMet),
        });
        setCmsCompletionOpen(true);
      }
    },
    [
      cmsModalBook,
      cmsModalSource,
      childId,
      courseId,
      mapCmsSessionToCompletion,
      submitBuiltinBookScore,
      updateContentProgress,
      fetchModuleDetails,
    ]
  );

  const openBuiltInCmsPlayer = useCallback(
    (content: PopulatedContentItem, cmsId: string, source: 'book' | 'videoFollowUp') => {
      lockLandscapeForCmsBookPlayer();
      resetCmsPlayer();
      setCmsModalSource(source);
      setCmsModalBook(content);
      void (async () => {
        const detail = await openCmsPlayableBook(cmsId);
        if (!detail?.pages?.length) {
          setCmsModalBook(null);
          setCmsModalSource('book');
          const msg =
            useCmsPlayerStore.getState().error ?? 'Could not load this built-in book.';
          Alert.alert('Book unavailable', msg);
        }
      })();
    },
    [openCmsPlayableBook, resetCmsPlayer]
  );

  const handleVideoComplete = useCallback(
    (completedVideo: PopulatedContentItem) => {
      if (childId) refreshVideoWatches(childId);
      fetchModuleDetails(courseId!, childId!);
      setVideoModal(null);

      if (isHtml5VideoFollowUp(completedVideo)) {
        openHtml5Modal(completedVideo);
        return;
      }

      if (isBuiltinCmsVideoFollowUp(completedVideo)) {
        const cmsId = getLinkedCmsBookId(completedVideo);
        if (cmsId) {
          openBuiltInCmsPlayer(completedVideo, cmsId, 'videoFollowUp');
        }
      }
    },
    [
      childId,
      courseId,
      fetchModuleDetails,
      openBuiltInCmsPlayer,
      openHtml5Modal,
      refreshVideoWatches,
    ]
  );

  const handleBookPress = useCallback(
    (book: PopulatedContentItem) => {
      if (isHtml5Book(book)) {
        openHtml5Modal(book);
        return;
      }
      if (isBuiltinCmsBook(book)) {
        const cmsId = getBuiltinCmsBookId(book);
        if (!cmsId) return;
        openBuiltInCmsPlayer(book, cmsId, 'book');
        return;
      }
      // SCORM not supported in app; tap does nothing for other books
    },
    [openHtml5Modal, openBuiltInCmsPlayer]
  );

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
        onBookPress={handleBookPress}
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
        onVideoComplete={(completedVideo) => {
          handleVideoComplete(completedVideo as PopulatedContentItem);
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
      <Html5Modal
        open={html5Open}
        onClose={closeHtml5Modal}
        launchUrl={html5LaunchUrl}
        title={html5Book?.title ?? undefined}
        loading={html5Loading}
        error={html5Error}
        courseId={courseId ?? null}
        childId={childId ?? null}
        bookId={html5Book && isHtml5Book(html5Book) ? getContentId(html5Book) : null}
        onAfterComplete={() => {
          if (courseId && childId) fetchModuleDetails(courseId, childId);
        }}
      />
      <CmsPlayerModal
        open={Boolean(cmsModalBook)}
        onClose={() => {
          setCmsModalBook(null);
          setCmsModalSource('book');
          resetCmsPlayer();
        }}
        pages={cmsPlayableBook?.pages ?? []}
        isPreloading={
          cmsModalBook && (isCmsBookLoading || !(cmsPlayableBook?.pages?.length ?? 0))
            ? true
            : undefined
        }
        onSessionComplete={handleCmsSessionComplete}
      />
      <CmsCompletionDialog
        open={cmsCompletionOpen}
        onClose={() => {
          setCmsCompletionOpen(false);
          setCmsCompletionData(null);
        }}
        data={cmsCompletionData}
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
