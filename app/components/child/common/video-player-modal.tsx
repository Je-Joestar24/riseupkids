/**
 * Video Player Modal
 * Child-facing: plays video (upload or Bunny embed WebView), records watch progress.
 */

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BunnyEmbedWebView } from '@/components/child/common/bunny-embed-webview';
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
import { resolveModuleVideoPlayback } from '@/utils/moduleVideoPlayback';

/** Minimal video shape for explore (url pre-built by caller) */
export interface ExploreVideoInput {
  _id: string;
  title: string;
  url?: string | null;
}

export type VideoPlayerModalVideo = PopulatedContentItem | ExploreVideoInput;

export interface VideoCompletionResult {
  starsJustAwarded?: boolean;
  starsWereAlreadyAwarded?: boolean;
  starsToAward?: number;
  videoWatch?: { watchCount?: number };
  requiredWatchCount?: number;
}

export interface VideoCompletionInfo {
  deferredCompletion?: boolean;
  watchResult?: VideoCompletionResult | null;
}

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
  onVideoComplete?: (video: VideoPlayerModalVideo, info?: VideoCompletionInfo) => void;
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

  const playback = useMemo(
    () =>
      video && !isExploreVideo
        ? resolveModuleVideoPlayback(video as PopulatedContentItem, getCoverImageUrl)
        : { mode: 'file' as const, url: null },
    [video, isExploreVideo]
  );
  const isBunnyEmbed = !isExploreVideo && playback.mode === 'embed';
  const embedUrl = isBunnyEmbed ? playback.url : null;

  const videoRef = useRef<Video>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isRecordingWatch, setIsRecordingWatch] = useState(false);
  const [hasRecordedWatch, setHasRecordedWatch] = useState(false);
  const [wasAlreadyWatched, setWasAlreadyWatched] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [watchResult, setWatchResult] = useState<VideoCompletionResult | null>(null);
  const [watchStatusBefore, setWatchStatusBefore] = useState<{
    currentWatchCount: number;
    requiredWatchCount: number;
    starsAwarded: boolean;
  } | null>(null);

  useEffect(() => {
    if (open && video) {
      if (isBunnyEmbed) {
        setVideoUrl(null);
      } else {
        setVideoUrl(getVideoUrl(video) ?? null);
      }
      setVideoEnded(false);
      setHasRecordedWatch(false);
      setWasAlreadyWatched(false);
      setShowCompletionDialog(false);
      setWatchResult(null);
      setWatchStatusBefore(null);
    }
  }, [open, video, isBunnyEmbed]);

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

      const nextWatchResult: VideoCompletionResult = {
        ...result,
        starsJustAwarded,
        starsWereAlreadyAwarded,
        starsToAward: result?.starsToAward,
      };

      setWatchResult(nextWatchResult);

      if (courseId && starsJustAwarded) {
        await moduleService.updateContentProgress(
          courseId,
          childId,
          videoId,
          'video'
        );
      }
      await refreshVideoWatches();

      const completedVideo = video;
      const hasFollowUp = isHtml5VideoFollowUp(completedVideo as ModuleVideoContentLike | null)
        || isBuiltinCmsVideoFollowUp(completedVideo as ModuleVideoContentLike | null);
      if (hasFollowUp && completedVideo) {
        setShowCompletionDialog(false);
        onClose();
        setTimeout(() => {
          onVideoComplete?.(completedVideo, {
            deferredCompletion: true,
            watchResult: nextWatchResult,
          });
        }, 180);
        return;
      }

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
    setShowConfirmClose(false);
    setShowCompletionDialog(false);
    setWatchResult(null);
    onClose();
  }, [onClose]);

  const skipCloseConfirm =
    (isExploreVideo && (wasAlreadyWatched || hasRecordedWatch)) ||
    (isBunnyEmbed && hasRecordedWatch);

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
    onClose();
    if (completedVideo) {
      setTimeout(() => {
        onVideoComplete?.(completedVideo);
      }, 180);
    }
    // Module videos: do not show global dialog; the in-modal completion card already showed the message.
    // Explore videos close before this (they show global dialog and close in handleVideoEnd).
  }, [onVideoComplete, video, onClose]);

  if (!open) return null;

  const hasPlayableSource = isBunnyEmbed ? Boolean(embedUrl) : Boolean(videoUrl);
  const showVideoView = !showCompletionDialog && hasPlayableSource;
  const showCompletion = showCompletionDialog;
  const showBunnyFinishButton = isBunnyEmbed && !hasRecordedWatch;

  return (
    <>
      <Modal
        visible={Boolean(showVideoView)}
        transparent
        animationType="slide"
        onRequestClose={handleCloseAttempt}
        statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.header}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {video?.title ?? 'Video'}
              </ThemedText>
              <Pressable
                onPress={handleCloseAttempt}
                style={styles.closeBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close">
                <MaterialIcons name="close" size={26} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.videoContainer} collapsable={false}>
              {isBunnyEmbed ? (
                <>
                  <BunnyEmbedWebView
                    embedUrl={embedUrl}
                    title={video?.title ?? 'Video'}
                    style={StyleSheet.absoluteFill}
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
              ) : videoUrl ? (
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

            {showBunnyFinishButton ? (
              <Pressable
                style={[styles.finishedBtn, isRecordingWatch && styles.finishedBtnDisabled]}
                onPress={handleVideoEnd}
                disabled={isRecordingWatch}
                accessibilityRole="button"
                accessibilityLabel="I finished watching">
                <ThemedText style={styles.finishedBtnText}>I finished watching</ThemedText>
              </Pressable>
            ) : null}

            <View style={styles.footer}>
              <Pressable style={styles.closeFooterBtn} onPress={handleCloseAttempt}>
                <ThemedText style={styles.closeFooterBtnText}>Close</ThemedText>
              </Pressable>
            </View>
          </View>

          <ConfirmModal
            inline
            open={showConfirmClose}
            title="Close Video?"
            message={
              isBunnyEmbed
                ? 'Do you want to close this video? Tap I finished watching when you are done to save your progress.'
                : 'Do you want to close this video? Your progress will be saved!'
            }
            confirmLabel="Yes, Close"
            cancelLabel="Keep Watching"
            onConfirm={handleConfirmedClose}
            onCancel={() => setShowConfirmClose(false)}
          />
        </View>
      </Modal>

      <VideoCompletionModal
        open={showCompletion}
        watchResult={watchResult}
        onClose={handleCompletionDialogClose}
      />
    </>
  );
}

export function VideoCompletionModal({
  open,
  watchResult,
  onClose,
  title = 'You Finished the Video!',
  message = 'Great job watching the video!',
  continueLabel = 'Continue',
}: {
  open: boolean;
  watchResult?: VideoCompletionResult | null;
  onClose: () => void;
  title?: string;
  message?: string;
  continueLabel?: string;
}) {
  if (!open) return null;

  const remainingWatches = Math.max(
    0,
    (watchResult?.requiredWatchCount ?? 0) - (watchResult?.videoWatch?.watchCount ?? 0)
  );

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.completionOverlay} onPress={onClose}>
        <View style={styles.completionCard}>
          <ThemedText style={styles.completionTitle}>{title}</ThemedText>
          <ThemedText style={styles.completionMessage}>
            {message}
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
              Watch {remainingWatches} more time(s) to earn stars!
            </ThemedText>
          )}
          <Pressable
            style={styles.continueBtn}
            onPress={onClose}>
            <ThemedText style={styles.continueBtnText}>{continueLabel}</ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
    position: 'relative',
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
    zIndex: 2,
    elevation: 2,
    backgroundColor: colors.bgCard,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.primary,
    marginRight: spacing[2],
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
    zIndex: 0,
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
  finishedBtn: {
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    backgroundColor: colors.accent,
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderRadius: radii.lg,
  },
  finishedBtnDisabled: {
    opacity: 0.6,
  },
  finishedBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing[4],
    borderTopWidth: 2,
    borderTopColor: colors.bgTertiary,
    zIndex: 2,
    elevation: 2,
    backgroundColor: colors.bgCard,
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
