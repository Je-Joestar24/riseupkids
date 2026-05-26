/**
 * Video Player Modal
 * Child-facing: plays video, restricted interaction (no pause/seek), custom fullscreen rotate
 * Uses useContentProgress, GlobalDialog on completion
 * Fullscreen button locks to landscape; exit restores portrait
 */

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ConfirmModal } from '@/components/child/common/confirm-modal';
import {
  getCoverImageUrl,
  isBuiltinCmsVideoFollowUp,
  isHtml5VideoFollowUp,
  type ModuleVideoContentLike,
} from '@/components/child/module/module-utils';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useContentProgress } from '@/hooks/contentProgressHook';
import { useExploreVideoWatch } from '@/hooks/exploreHook';
import { moduleService } from '@/services/moduleService';
import { isExploreContentAlreadyWatched } from '@/utils/exploreWatchStatus';
import { useUiStore } from '@/store/uiStore';
import type { PopulatedContentItem } from '@/services/moduleService';

const PORTRAIT_LOCK = ScreenOrientation.OrientationLock.PORTRAIT_UP;
const LANDSCAPE_LOCK = ScreenOrientation.OrientationLock.LANDSCAPE;

/** Minimal video shape for explore (url pre-built by caller) */
export interface ExploreVideoInput {
  _id: string;
  title: string;
  url?: string | null;
}

export type VideoPlayerModalVideo = PopulatedContentItem | ExploreVideoInput;

export interface VideoPlayerModalProps {
  open: boolean;
  onClose: () => void;
  video: VideoPlayerModalVideo | null;
  childId: string | null;
  courseId?: string | null;
  /** Explore video: use explore watch API and pass content id + type for completion */
  isExploreVideo?: boolean;
  exploreContentId?: string | null;
  videoType?: string;
  onVideoComplete?: (video: VideoPlayerModalVideo) => void;
}

/** Build full video URL from url or filePath */
function getVideoUrl(video: VideoPlayerModalVideo | null): string | null {
  if (!video) return null;
  const v = video as { url?: string; filePath?: string };
  const raw = v.url ?? v.filePath;
  if (raw && typeof raw === 'string') {
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return getCoverImageUrl(raw);
  }
  const fallback = (video as { url?: string; filePath?: string }).url ?? (video as { filePath?: string }).filePath;
  return getCoverImageUrl(typeof fallback === 'string' ? fallback : null);
}

export function VideoPlayerModal({
  open,
  onClose,
  video,
  childId,
  courseId,
  isExploreVideo,
  exploreContentId,
  videoType,
  onVideoComplete,
}: VideoPlayerModalProps) {
  const videoId = String(video?._id ?? (video as { _contentId?: string })?._contentId ?? (video as { contentId?: string })?.contentId ?? (video as { id?: string })?.id ?? '');
  const showDialog = useUiStore((s) => s.showDialog);

  const {
    markVideoWatched,
    getVideoWatchStatus,
    refreshVideoWatches,
  } = useContentProgress({ childId, courseId: isExploreVideo ? undefined : courseId });

  const { markExploreVideoWatched, getExploreVideoWatchStatus } = useExploreVideoWatch(childId);

  const videoRef = useRef<Video>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isRecordingWatch, setIsRecordingWatch] = useState(false);
  const [hasRecordedWatch, setHasRecordedWatch] = useState(false);
  const [wasAlreadyWatched, setWasAlreadyWatched] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [watchResult, setWatchResult] = useState<{
    starsJustAwarded?: boolean;
    starsWereAlreadyAwarded?: boolean;
    starsToAward?: number;
    videoWatch?: { watchCount?: number };
    requiredWatchCount?: number;
  } | null>(null);
  const [watchStatusBefore, setWatchStatusBefore] = useState<{
    currentWatchCount: number;
    requiredWatchCount: number;
    starsAwarded: boolean;
  } | null>(null);

  const enterFullscreen = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(LANDSCAPE_LOCK);
      setIsFullscreen(true);
    } catch {
      // ignore
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(PORTRAIT_LOCK);
      setIsFullscreen(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    exitFullscreen();
  }, [open, exitFullscreen]);

  useEffect(() => {
    if (open && video) {
      const url = getVideoUrl(video);
      setVideoUrl(url ?? null);
      setVideoEnded(false);
      setHasRecordedWatch(false);
      setWasAlreadyWatched(false);
      setShowCompletionDialog(false);
      setWatchResult(null);
      setWatchStatusBefore(null);
    }
  }, [open, video]);

  useEffect(() => {
    if (!open || !isExploreVideo || !childId || !exploreContentId) {
      setWasAlreadyWatched(false);
      return;
    }
    let cancelled = false;
    getExploreVideoWatchStatus(exploreContentId)
      .then((status) => {
        if (!cancelled) setWasAlreadyWatched(isExploreContentAlreadyWatched(status));
      })
      .catch(() => {
        if (!cancelled) setWasAlreadyWatched(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isExploreVideo, childId, exploreContentId, getExploreVideoWatchStatus]);

  useEffect(() => {
    if (open && childId && videoId && !isExploreVideo) {
      getVideoWatchStatus(videoId).then((status) => {
        const s = status as {
          currentWatchCount?: number;
          requiredWatchCount?: number;
          starsAwarded?: boolean;
        } | null;
        if (s) {
          setWatchStatusBefore({
            currentWatchCount: s.currentWatchCount ?? 0,
            requiredWatchCount: s.requiredWatchCount ?? 5,
            starsAwarded: s.starsAwarded ?? false,
          });
        }
      });
    }
  }, [open, childId, videoId, isExploreVideo, getVideoWatchStatus]);

  const handleVideoEnd = useCallback(async () => {
    if (hasRecordedWatch || !childId) return;
    if (isExploreVideo) {
      if (!exploreContentId) return;
      setVideoEnded(true);
      setIsRecordingWatch(true);
      setHasRecordedWatch(true);
      try {
        await markExploreVideoWatched(exploreContentId, 100, videoType);
        showDialog({
          message: 'Great job watching the video!',
          type: 'success',
          duration: 4000,
        });
        exitFullscreen();
        setShowCompletionDialog(false);
        setWatchResult(null);
        if (video) onVideoComplete?.(video);
        onClose();
      } catch (e) {
        showDialog({
          message: (e as Error)?.message ?? 'Failed to record video watch',
          type: 'error',
          duration: 5000,
        });
        setShowCompletionDialog(true);
      } finally {
        setIsRecordingWatch(false);
      }
      return;
    }
    if (!videoId || videoId === 'undefined') return;
    setVideoEnded(true);
    setIsRecordingWatch(true);
    setHasRecordedWatch(true);
    try {
      const result = (await markVideoWatched(videoId, 100)) as {
        videoWatch?: { watchCount?: number };
        requiredWatchCount?: number;
        starsAwarded?: boolean;
        starsToAward?: number;
      } | null;
      const before = watchStatusBefore;
      const starsWereAlreadyAwarded = before?.starsAwarded ?? false;
      const watchCountAfter = result?.videoWatch?.watchCount ?? 0;
      const required = result?.requiredWatchCount ?? before?.requiredWatchCount ?? 5;
      const starsJustAwarded =
        Boolean(result?.starsAwarded) &&
        !starsWereAlreadyAwarded &&
        watchCountAfter >= required;

      setWatchResult({
        ...result,
        starsJustAwarded,
        starsWereAlreadyAwarded,
        starsToAward: result?.starsToAward,
      });

      if (courseId && starsJustAwarded) {
        await moduleService.updateContentProgress(
          courseId,
          childId,
          videoId,
          'video'
        );
      }
      await refreshVideoWatches();
      setShowCompletionDialog(true);
    } catch (e) {
      showDialog({
        message: (e as Error)?.message ?? 'Failed to record video watch',
        type: 'error',
        duration: 5000,
      });
      setShowCompletionDialog(true);
    } finally {
      setIsRecordingWatch(false);
    }
  }, [
    hasRecordedWatch,
    childId,
    videoId,
    video,
    isExploreVideo,
    exploreContentId,
    videoType,
    markExploreVideoWatched,
    markVideoWatched,
    watchStatusBefore,
    courseId,
    refreshVideoWatches,
    showDialog,
    exitFullscreen,
    onClose,
    onVideoComplete,
  ]);

  const handlePlaybackStatusUpdate = useCallback(
    (status: { isLoaded?: boolean; didJustFinish?: boolean; isPlaying?: boolean }) => {
      if (status.isLoaded && status.didJustFinish) {
        handleVideoEnd();
      }
      if (status.isLoaded && !status.isPlaying && !status.didJustFinish && !videoEnded) {
        videoRef.current?.playAsync().catch(() => {});
      }
    },
    [handleVideoEnd, videoEnded]
  );

  const handleConfirmedClose = useCallback(() => {
    exitFullscreen();
    setShowConfirmClose(false);
    setShowCompletionDialog(false);
    setWatchResult(null);
    onClose();
  }, [exitFullscreen, onClose]);

  const skipCloseConfirm =
    isExploreVideo && (wasAlreadyWatched || hasRecordedWatch);

  const handleCloseAttempt = useCallback(() => {
    if (skipCloseConfirm) {
      handleConfirmedClose();
      return;
    }
    setShowConfirmClose(true);
  }, [skipCloseConfirm, handleConfirmedClose]);

  const handleCompletionDialogClose = useCallback(() => {
    const completedVideo = video;
    setShowCompletionDialog(false);
    exitFullscreen();
    onClose();
    if (completedVideo) {
      setTimeout(() => {
        onVideoComplete?.(completedVideo);
      }, 180);
    }
    // Module videos: do not show global dialog; the in-modal completion card already showed the message.
    // Explore videos close before this (they show global dialog and close in handleVideoEnd).
  }, [exitFullscreen, onVideoComplete, video, onClose]);

  const videoFollowUp = video as ModuleVideoContentLike | null;
  const continueLabel = isHtml5VideoFollowUp(videoFollowUp)
    ? 'Continue to HTML5 Book'
    : isBuiltinCmsVideoFollowUp(videoFollowUp)
      ? 'Continue to Book'
      : 'Continue';

  if (!open) return null;

  const showVideoView = !showCompletionDialog && videoUrl;
  const showCompletion = showCompletionDialog;

  return (
    <>
      <Modal
        visible={Boolean(showVideoView)}
        transparent
        animationType="slide"
        onRequestClose={handleCloseAttempt}
        statusBarTranslucent>
        <View style={[styles.overlay, isFullscreen && styles.overlayFullscreen]}>
          {isFullscreen ? (
            <View style={styles.fullscreenContainer}>
              <Video
                ref={videoRef}
                source={{ uri: videoUrl ?? '' }}
                style={StyleSheet.absoluteFill}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls={false}
                shouldPlay
                isLooping={false}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              />
              {isRecordingWatch && (
                <View style={styles.recordingOverlay}>
                  <ActivityIndicator size="large" color={colors.secondary} />
                  <ThemedText style={styles.recordingText}>
                    Recording your progress...
                  </ThemedText>
                </View>
              )}
              <Pressable
                style={styles.exitFullscreenBtn}
                onPress={exitFullscreen}
                accessibilityRole="button"
                accessibilityLabel="Exit fullscreen">
                <MaterialCommunityIcons
                  name="fullscreen-exit"
                  size={32}
                  color={colors.textInverse}
                />
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.header}>
                <ThemedText style={styles.title} numberOfLines={1}>
                  {video?.title ?? 'Video'}
                </ThemedText>
                <View style={styles.headerActions}>
                  <Pressable
                    style={styles.fullscreenBtn}
                    onPress={enterFullscreen}
                    accessibilityRole="button"
                    accessibilityLabel="Fullscreen (rotate)">
                    <MaterialCommunityIcons
                      name="fullscreen"
                      size={24}
                      color={colors.secondary}
                    />
                  </Pressable>
                  <Pressable
                    onPress={handleCloseAttempt}
                    hitSlop={12}
                    accessibilityLabel="Close">
                    <MaterialIcons name="close" size={26} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.videoContainer}>
                {videoUrl ? (
                  <>
                    <Video
                      ref={videoRef}
                      source={{ uri: videoUrl }}
                      style={StyleSheet.absoluteFill}
                      resizeMode={ResizeMode.CONTAIN}
                      useNativeControls={false}
                      shouldPlay
                      isLooping={false}
                      onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                    />
                    {isRecordingWatch && (
                      <View style={styles.recordingOverlay}>
                        <ActivityIndicator size="large" color={colors.secondary} />
                        <ThemedText style={styles.recordingText}>
                          Recording your progress...
                        </ThemedText>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={colors.secondary} />
                    <ThemedText style={styles.loadingText}>Loading video...</ThemedText>
                  </View>
                )}
              </View>

              <View style={styles.footer}>
                <Pressable style={styles.closeFooterBtn} onPress={handleCloseAttempt}>
                  <ThemedText style={styles.closeFooterBtnText}>Close</ThemedText>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Completion overlay - inline (not a separate modal) so it appears over the video modal */}
      {showCompletion && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={handleCompletionDialogClose}
          statusBarTranslucent>
          <Pressable style={styles.completionOverlay} onPress={handleCompletionDialogClose}>
            <View style={styles.completionCard}>
              <ThemedText style={styles.completionTitle}>You Finished the Video!</ThemedText>
              <ThemedText style={styles.completionMessage}>
                Great job watching the video!
              </ThemedText>
              {watchResult?.starsJustAwarded && watchResult.starsToAward ? (
                <View style={styles.starsWrap}>
                  <MaterialCommunityIcons name="star" size={40} color={colors.accent} />
                  <ThemedText style={styles.starsText}>
                    You earned {watchResult.starsToAward} stars!
                  </ThemedText>
                  <MaterialCommunityIcons name="star" size={40} color={colors.accent} />
                </View>
              ) : watchResult?.starsWereAlreadyAwarded ? (
                <ThemedText style={styles.starsAlreadyText}>
                  Stars already earned for this video! ⭐
                </ThemedText>
              ) : (
                <ThemedText style={styles.watchMoreText}>
                  Watch {watchResult?.requiredWatchCount && watchResult?.videoWatch?.watchCount !== undefined
                    ? watchResult.requiredWatchCount - (watchResult.videoWatch.watchCount ?? 0)
                    : 0} more time(s) to earn stars!
                </ThemedText>
              )}
              <Pressable
                style={styles.continueBtn}
                onPress={handleCompletionDialogClose}>
                <ThemedText style={styles.continueBtnText}>{continueLabel}</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      <ConfirmModal
        open={showConfirmClose}
        title="Close Video?"
        message="Do you want to close this video? Your progress will be saved!"
        confirmLabel="Yes, Close"
        cancelLabel="Keep Watching"
        onConfirm={handleConfirmedClose}
        onCancel={() => setShowConfirmClose(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  overlayFullscreen: {
    padding: 0,
    backgroundColor: '#000',
  },
  fullscreenContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  exitFullscreenBtn: {
    position: 'absolute',
    top: spacing[6],
    right: spacing[4],
    padding: spacing[2],
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderBottomWidth: 3,
    borderBottomColor: colors.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 2,
    borderBottomColor: colors.bgTertiary,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  fullscreenBtn: {
    padding: spacing[2],
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  recordingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
  },
  recordingText: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textInverse,
  },
  loadingWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
  },
  loadingText: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textInverse,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing[4],
    borderTopWidth: 2,
    borderTopColor: colors.bgTertiary,
  },
  closeFooterBtn: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  closeFooterBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.secondary,
  },
  completionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  completionCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.bgCard,
    borderRadius: radii['2xl'],
    padding: spacing[8],
    alignItems: 'center',
  },
  completionTitle: {
    fontSize: typography.sizes['3xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  completionMessage: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_400Regular',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  starsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  starsText: {
    fontSize: typography.sizes['2xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.success,
  },
  starsAlreadyText: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.accent,
    marginBottom: spacing[6],
  },
  watchMoreText: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    marginBottom: spacing[6],
  },
  continueBtn: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    borderRadius: radii.xl,
  },
  continueBtnText: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
});
