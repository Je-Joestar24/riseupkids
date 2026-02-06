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
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ConfirmModal } from '@/components/child/common/confirm-modal';
import { getCoverImageUrl } from '@/components/child/module/module-utils';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useContentProgress } from '@/hooks/contentProgressHook';
import { moduleService } from '@/services/moduleService';
import { useUiStore } from '@/store/uiStore';
import type { PopulatedContentItem } from '@/services/moduleService';

export interface VideoPlayerModalProps {
  open: boolean;
  onClose: () => void;
  video: PopulatedContentItem | null;
  childId: string | null;
  courseId?: string | null;
  onVideoComplete?: (video: PopulatedContentItem) => void;
}

/** Build full video URL from url or filePath */
function getVideoUrl(video: PopulatedContentItem | null): string | null {
  if (!video) return null;
  const raw = (video as { url?: string; filePath?: string }).url ?? (video as { filePath?: string }).filePath;
  if (!raw || typeof raw !== 'string') return null;
  return getCoverImageUrl(raw);
}

export function VideoPlayerModal({
  open,
  onClose,
  video,
  childId,
  courseId,
  onVideoComplete,
}: VideoPlayerModalProps) {
  const videoId = String(video?._id ?? video?._contentId ?? video?.contentId ?? video?.id ?? '');
  const showDialog = useUiStore((s) => s.showDialog);

  const {
    markVideoWatched,
    getVideoWatchStatus,
    refreshVideoWatches,
    updateCourseContentProgress,
    isLoadingVideo,
  } = useContentProgress({ childId, courseId });

  const videoRef = useRef<Video>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isRecordingWatch, setIsRecordingWatch] = useState(false);
  const [hasRecordedWatch, setHasRecordedWatch] = useState(false);
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

  const PORTRAIT = ScreenOrientation.OrientationLock.PORTRAIT_UP;
  const LANDSCAPE = ScreenOrientation.OrientationLock.LANDSCAPE;

  const enterFullscreen = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(LANDSCAPE);
      setIsFullscreen(true);
    } catch {
      // ignore
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      await ScreenOrientation.lockAsync(PORTRAIT);
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
      setShowCompletionDialog(false);
      setWatchResult(null);
      setWatchStatusBefore(null);
    }
  }, [open, video]);

  useEffect(() => {
    if (open && childId && videoId) {
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
  }, [open, childId, videoId, getVideoWatchStatus]);

  const handleVideoEnd = useCallback(async () => {
    if (hasRecordedWatch || !childId || !videoId || videoId === 'undefined') return;
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
    markVideoWatched,
    watchStatusBefore,
    courseId,
    refreshVideoWatches,
    showDialog,
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

  const handleCloseAttempt = useCallback(() => {
    setShowConfirmClose(true);
  }, []);

  const handleConfirmedClose = useCallback(() => {
    exitFullscreen();
    setShowConfirmClose(false);
    setShowCompletionDialog(false);
    setWatchResult(null);
    if (video) onVideoComplete?.(video);
    onClose();
  }, [exitFullscreen, onVideoComplete, video, onClose]);

  const handleCompletionDialogClose = useCallback(() => {
    setShowCompletionDialog(false);
    exitFullscreen();
    if (video) onVideoComplete?.(video);
    onClose();
    const msg =
      watchResult?.starsJustAwarded && watchResult.starsToAward
        ? `You earned ${watchResult.starsToAward} star${watchResult.starsToAward !== 1 ? 's' : ''}! 🎉`
        : watchResult?.starsWereAlreadyAwarded
          ? 'Stars already earned for this video! ⭐'
          : 'Great job watching the video! 🎬';
    showDialog({
      message: msg,
      type: 'success',
      duration: 4000,
    });
  }, [watchResult, exitFullscreen, showDialog, onVideoComplete, video, onClose]);

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
                <ThemedText style={styles.continueBtnText}>Continue</ThemedText>
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
