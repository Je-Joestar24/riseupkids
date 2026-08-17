/**
 * Module (course detail) screen – opened from a journey card.
 * Sibling route to journey (not a child); footer still shows "My Journey" active.
 * courseId is passed via query: /child/[id]/module?courseId=...
 */

import { useGlobalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import {
  VideoCompletionModal,
  VideoPlayerModal,
  type VideoCompletionInfo,
  type VideoCompletionResult,
} from '@/components/child/common/video-player-modal';
import { ModuleAudioAssignments } from '@/components/child/module/module-audio-assignments';
import { ModuleBooks } from '@/components/child/module/module-books';
import { ModuleBreadcrumbs } from '@/components/child/module/module-breadcrumbs';
import { ModuleChants } from '@/components/child/module/module-chants';
import { ModuleFooter } from '@/components/child/module/module-footer';
import { ModuleHeader } from '@/components/child/module/module-header';
import { ModuleShellSkeletalLoading } from '@/components/child/module/module-skeletal-loading';
import { ModuleProgress } from '@/components/child/module/module-progress';
import {
  getBuiltinCmsBookId,
  getCoverImageUrl,
  getLinkedCmsBookId,
  getModuleBadgeLabel,
  isBuiltinCmsVideoFollowUp,
  isHtml5VideoFollowUp,
  isBuiltinCmsBook,
  MODULE_PAGE_BACKGROUND,
} from '@/components/child/module/module-utils';
import { ModuleVideos } from '@/components/child/module/module-videos';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { spacing } from '@/config/theme/spacing';
import { useCmsBookPlayer } from '@/hooks/cmsBookPlayerHook';
import { useJourney } from '@/hooks/journeyHook';
import { useCmsPlayerStore } from '@/store/cmsPLayerStore';
import { useExploreStore } from '@/store/exploreStore';
import { useHtml5Modal, isHtml5Book } from '@/hooks/html5Hook';
import { useModule } from '@/hooks/moduleHook';
import {
  findFirstBuiltinCmsBookId,
  prefetchCmsBuiltinBookStartPack,
} from '@/services/cmsBookLibraryPrefetch';
import type { BuiltInBookCompletionPayload } from '@/services/cmsBooksPlayerService';
import type { PopulatedContentItem } from '@/services/moduleService';
import {
  parseBookCompletionStarPayload,
  runBackgroundAfterStarReward,
} from '@/utils/bookCompletionStarReward';

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
  const [pendingVideoCompletion, setPendingVideoCompletion] = useState<{
    video: PopulatedContentItem;
    watchResult: VideoCompletionResult | null;
  } | null>(null);
  const [videoCompletionOpen, setVideoCompletionOpen] = useState(false);
  const [cmsCompletionOpen, setCmsCompletionOpen] = useState(false);
  const [cmsCompletionData, setCmsCompletionData] = useState<CmsCompletionDialogData | null>(null);
  const applyChildStarReward = useExploreStore((s) => s.applyChildStarReward);

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

  const { coursesWithProgress } = useJourney(childId);

  const badgeLabel = useMemo(
    () =>
      getModuleBadgeLabel(
        coursesWithProgress,
        String(courseId ?? ''),
        course?.title ?? 'Course'
      ),
    [coursesWithProgress, courseId, course?.title]
  );

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
      const parsed = parseBookCompletionStarPayload(completionRes?.data);

      // Apply stars + open reward UI before module refresh (perceived speed)
      if (payload.trigger === 'home') {
        const syncedTotalStars = childId
          ? applyChildStarReward(childId, {
              starsToAward: parsed.starsToAward,
              totalStars: parsed.totalStars,
            })
          : undefined;
        setCmsCompletionData({
          score,
          maxScore,
          attemptCount: payload.attemptCount,
          starsAwarded: parsed.starsAwarded,
          starsToAward: parsed.starsToAward,
          totalStars: syncedTotalStars ?? parsed.totalStars,
          readingCount: parsed.readingCount,
          requiredReadingCount: parsed.requiredReadingCount,
          requirementMet: parsed.requirementMet,
        });
        setCmsCompletionOpen(true);
      } else if (childId && completionRes?.success) {
        applyChildStarReward(childId, {
          starsToAward: parsed.starsToAward,
          totalStars: parsed.totalStars,
        });
      }

      // Background refresh — never block the star reward UI
      runBackgroundAfterStarReward(async () => {
        if (completionRes?.success) {
          await updateContentProgress(courseId, childId, libraryBookId, 'book');
        }
        await fetchModuleDetails(courseId, childId);
      }, 'CMS');
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
      applyChildStarReward,
    ]
  );

  const showPendingVideoCompletion = useCallback(() => {
    if (!pendingVideoCompletion) return;
    setVideoCompletionOpen(true);
  }, [pendingVideoCompletion]);

  const closeVideoCompletion = useCallback(() => {
    setVideoCompletionOpen(false);
    setPendingVideoCompletion(null);
  }, []);

  const isPendingHtml5VideoFollowUp = Boolean(
    pendingVideoCompletion && isHtml5VideoFollowUp(pendingVideoCompletion.video)
  );

  const closeHtml5FollowUp = useCallback(() => {
    const shouldShowVideoCompletion =
      Boolean(pendingVideoCompletion) &&
      isHtml5VideoFollowUp(pendingVideoCompletion?.video);
    closeHtml5Modal();
    if (shouldShowVideoCompletion) {
      setTimeout(showPendingVideoCompletion, 180);
    }
  }, [closeHtml5Modal, pendingVideoCompletion, showPendingVideoCompletion]);

  const closeCmsPlayer = useCallback(() => {
    const shouldShowVideoCompletion =
      cmsModalSource === 'videoFollowUp' && Boolean(pendingVideoCompletion);
    setCmsModalBook(null);
    setCmsModalSource('book');
    resetCmsPlayer();
    if (shouldShowVideoCompletion) {
      setTimeout(showPendingVideoCompletion, 180);
    }
  }, [cmsModalSource, pendingVideoCompletion, resetCmsPlayer, showPendingVideoCompletion]);

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
    (completedVideo: PopulatedContentItem, completionInfo?: VideoCompletionInfo) => {
      if (childId) refreshVideoWatches(childId);
      fetchModuleDetails(courseId!, childId!);
      setVideoModal(null);

      if (completionInfo?.deferredCompletion) {
        setPendingVideoCompletion({
          video: completedVideo,
          watchResult: completionInfo.watchResult ?? null,
        });
      }

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

  const firstBuiltinBookId = useMemo(() => findFirstBuiltinCmsBookId(books), [books]);

  useEffect(() => {
    if (!firstBuiltinBookId || cmsModalBook) return undefined;
    const timer = setTimeout(() => {
      void prefetchCmsBuiltinBookStartPack(firstBuiltinBookId).catch(() => undefined);
    }, 450);
    return () => clearTimeout(timer);
  }, [firstBuiltinBookId, cmsModalBook]);

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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <ModuleShellSkeletalLoading childId={childId} />
      </ScrollView>
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      <ModuleHeader
        badgeLabel={badgeLabel}
        childId={childId}
        coverImageUrl={getCoverImageUrl(course.coverImage ?? course.coverImagePath ?? undefined)}
        courseTitle={course.title ?? 'Course'}
      />
      <ModuleBreadcrumbs badgeLabel={badgeLabel} childId={childId} />
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
        onVideoComplete={(completedVideo, completionInfo) => {
          handleVideoComplete(completedVideo as PopulatedContentItem, completionInfo);
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
        onClose={closeHtml5FollowUp}
        launchUrl={html5LaunchUrl}
        title={html5Book?.title ?? undefined}
        loading={html5Loading}
        error={html5Error}
        courseId={courseId ?? null}
        childId={childId ?? null}
        bookId={html5Book && isHtml5Book(html5Book) ? getContentId(html5Book) : null}
        closeOnResultContinue={isPendingHtml5VideoFollowUp}
        onAfterComplete={() => {
          if (courseId && childId) fetchModuleDetails(courseId, childId);
          if (isPendingHtml5VideoFollowUp) {
            closeHtml5FollowUp();
          }
        }}
      />
      <CmsPlayerModal
        open={Boolean(cmsModalBook)}
        onClose={closeCmsPlayer}
        book={cmsPlayableBook}
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
      <VideoCompletionModal
        open={videoCompletionOpen}
        watchResult={pendingVideoCompletion?.watchResult ?? null}
        onClose={closeVideoCompletion}
        title="You Finished the Video!"
        message="Great job finishing the video and activity!"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MODULE_PAGE_BACKGROUND,
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
    color: colors.text,
    textAlign: 'center',
    padding: spacing[5],
  },
});
