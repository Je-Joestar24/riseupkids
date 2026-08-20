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
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { useVideoPlayerFullscreen } from '@/hooks/useVideoPlayerFullscreen';
import { moduleService } from '@/services/moduleService';
import { useExploreStore } from '@/store/exploreStore';
import { isExploreContentAlreadyWatched } from '@/utils/exploreWatchStatus';
import { useUiStore } from '@/store/uiStore';
import type { PopulatedContentItem } from '@/services/moduleService';
import { resolveModuleVideoPlayback } from '@/utils/moduleVideoPlayback';
import { restoreAndroidImmersiveDefault } from '@/utils/androidNavigationBar';
import { CMS_PLAYER_MODAL_ORIENTATIONS } from '@/utils/cmsPlayerOrientation';

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
  const applyChildStarReward = useExploreStore((s) => s.applyChildStarReward);

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
  const { isFullscreen, enterFullscreen, exitFullscreen } = useVideoPlayerFullscreen(open);
  const { width: winW, height: winH } = useWindowDimensions();
  const fullscreenStageStyle = useMemo(() => {
    if (!isFullscreen || !(winW > 0) || !(winH > 0)) return null;
    const byWidthH = (winW * 9) / 16;
    if (byWidthH <= winH) {
      return { width: winW, height: byWidthH };
    }
    return { width: (winH * 16) / 9, height: winH };
  }, [isFullscreen, winW, winH]);

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
      const wasFullyCompleteBefore = before?.starsAwarded ?? false;
      const isFullyCompleteNow = Boolean(result?.videoWatch?.starsAwarded ?? result?.allStarsAwarded);
      const starsJustAwarded = (result?.starsToAward ?? result?.starsEarnedThisSession ?? 0) > 0;

      const nextWatchResult: VideoCompletionResult = {
        ...result,
        starsJustAwarded,
        starsWereAlreadyAwarded: wasFullyCompleteBefore && !starsJustAwarded,
        allStarsAwarded: isFullyCompleteNow,
        starsToAward: result?.starsToAward,
      };

      setWatchResult(nextWatchResult);

      if (childId && starsJustAwarded) {
        applyChildStarReward(childId, {
          starsToAward: result?.starsToAward ?? result?.starsEarnedThisSession ?? 0,
        });
      }

      const completedVideo = video;
      const hasFollowUp = isHtml5VideoFollowUp(completedVideo as ModuleVideoContentLike | null)
        || isBuiltinCmsVideoFollowUp(completedVideo as ModuleVideoContentLike | null);

      // Show reward UI immediately; refresh module state in the background
      if (hasFollowUp && completedVideo) {
        setShowCompletionDialog(false);
        onClose();
        setTimeout(() => {
          onVideoComplete?.(completedVideo, {
            deferredCompletion: true,
            watchResult: nextWatchResult,
          });
        }, 180);
      } else {
        setShowCompletionDialog(true);
      }

      void (async () => {
        try {
          if (courseId && isFullyCompleteNow && !wasFullyCompleteBefore) {
            await moduleService.updateContentProgress(
              courseId,
              childId,
              videoId,
              'video'
            );
          }
          await refreshVideoWatches();
        } catch (refreshError) {
          console.error('[Video] Background refresh after star reward failed:', refreshError);
        }
      })();
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
    applyChildStarReward,
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
    void exitFullscreen();
    onClose();
  }, [onClose, exitFullscreen]);

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
    void exitFullscreen();
    onClose();
    if (completedVideo) {
      setTimeout(() => {
        onVideoComplete?.(completedVideo);
      }, 180);
    }
    // Module videos: do not show global dialog; the in-modal completion card already showed the message.
    // Explore videos close before this (they show global dialog and close in handleVideoEnd).
  }, [onVideoComplete, video, onClose, exitFullscreen]);

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
        supportedOrientations={
          Platform.OS === 'ios' ? [...CMS_PLAYER_MODAL_ORIENTATIONS] : undefined
        }
        onRequestClose={handleCloseAttempt}
        statusBarTranslucent
        navigationBarTranslucent={Platform.OS === 'android'}
        onShow={() => {
          if (Platform.OS === 'android') {
            restoreAndroidImmersiveDefault();
          }
        }}>
        <View style={[styles.overlay, isFullscreen && styles.overlayFullscreen]}>
          {isFullscreen && Platform.OS === 'android' ? (
            <View style={styles.whiteFill} pointerEvents="none" />
          ) : null}
          <View style={[styles.card, isFullscreen && styles.cardFullscreen]}>
            {!isFullscreen ? (
              <View style={styles.header}>
                <ThemedText style={styles.title} numberOfLines={1}>
                  {video?.title ?? 'Video'}
                </ThemedText>
                <View style={styles.headerActions}>
                  <Pressable
                    onPress={() => {
                      void enterFullscreen();
                    }}
                    style={styles.headerIconBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Fullscreen"
                  >
                    <MaterialCommunityIcons name="fullscreen" size={26} color={colors.secondary} />
                  </Pressable>
                  <Pressable
                    onPress={handleCloseAttempt}
                    style={styles.headerIconBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <MaterialIcons name="close" size={26} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View
              style={[styles.videoContainer, isFullscreen && styles.videoContainerFullscreen]}
              collapsable={false}
            >
              <View
                style={
                  isFullscreen && fullscreenStageStyle
                    ? [styles.videoStage, fullscreenStageStyle]
                    : styles.videoStageFill
                }
              >
                {isBunnyEmbed ? (
                  <>
                    <BunnyEmbedWebView
                      embedUrl={embedUrl}
                      title={video?.title ?? 'Video'}
                      style={StyleSheet.absoluteFill}
                      interactionMode="watchOnly"
                      playbackPreset="watchOnly"
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
            </View>

            {showBunnyFinishButton && !isFullscreen ? (
              <Pressable
                style={[styles.finishedBtn, isRecordingWatch && styles.finishedBtnDisabled]}
                onPress={handleVideoEnd}
                disabled={isRecordingWatch}
                accessibilityRole="button"
                accessibilityLabel="I finished watching"
              >
                <ThemedText style={styles.finishedBtnText}>I finished watching</ThemedText>
              </Pressable>
            ) : null}

            {isFullscreen ? (
              <Pressable
                onPress={() => {
                  void exitFullscreen();
                }}
                style={styles.exitFullscreenBtn}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Exit fullscreen"
              >
                <MaterialCommunityIcons name="fullscreen-exit" size={28} color={colors.secondary} />
              </Pressable>
            ) : (
              <View style={styles.footer}>
                <Pressable style={styles.closeFooterBtn} onPress={handleCloseAttempt}>
                  <ThemedText style={styles.closeFooterBtnText}>Close</ThemedText>
                </Pressable>
              </View>
            )}
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
  const insets = useSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  const compact = winH < 700 || winW < 380;
  const maxCardHeight = Math.max(
    240,
    winH - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - spacing[4] * 2
  );

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
      <View
        style={[
          styles.completionOverlay,
          {
            paddingTop: Math.max(insets.top, spacing[3]),
            paddingBottom: Math.max(insets.bottom, spacing[3]),
          },
        ]}>
        <View style={[styles.completionCard, { maxHeight: maxCardHeight }]}>
          <ScrollView
            style={{ maxHeight: Math.max(140, maxCardHeight - 88) }}
            contentContainerStyle={styles.completionScrollContent}
            showsVerticalScrollIndicator
            bounces
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            accessibilityLabel="Completion details">
            <ThemedText style={[styles.completionTitle, compact && styles.completionTitleCompact]}>
              {title}
            </ThemedText>
            <ThemedText style={[styles.completionMessage, compact && styles.completionMessageCompact]}>
              {message}
            </ThemedText>
            {watchResult?.starsJustAwarded && watchResult.starsToAward ? (
              <View style={styles.starsWrap}>
                <MaterialCommunityIcons name="star" size={compact ? 28 : 40} color={colors.accent} />
                <ThemedText style={[styles.starsText, compact && styles.starsTextCompact]}>
                  You earned {watchResult.starsToAward} stars!
                </ThemedText>
                <MaterialCommunityIcons name="star" size={compact ? 28 : 40} color={colors.accent} />
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
          </ScrollView>
          <View style={styles.completionFooter}>
            <Pressable
              style={styles.continueBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={continueLabel}>
              <ThemedText style={styles.continueBtnText}>{continueLabel}</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
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
  overlayFullscreen: {
    backgroundColor: '#ffffff',
    padding: 0,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  whiteFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
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
  cardFullscreen: {
    flex: 1,
    maxWidth: '100%',
    borderRadius: 0,
    borderBottomWidth: 0,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  headerIconBtn: {
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
  videoContainerFullscreen: {
    flex: 1,
    width: '100%',
    aspectRatio: undefined,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoStage: {
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },
  videoStageFill: {
    ...StyleSheet.absoluteFillObject,
  },
  exitFullscreenBtn: {
    position: 'absolute',
    right: spacing[4],
    bottom: spacing[4],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    elevation: 30,
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
  finishedBtnFullscreen: {
    position: 'absolute',
    left: spacing[4],
    right: 72,
    bottom: spacing[4],
    marginHorizontal: 0,
    marginTop: 0,
    zIndex: 20,
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
    paddingHorizontal: spacing[4],
  },
  completionCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.bgCard,
    borderRadius: radii['2xl'],
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  completionScrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[3],
    alignItems: 'center',
  },
  completionFooter: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[5],
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.bgTertiary,
  },
  completionTitle: {
    fontSize: typography.sizes['3xl'],
    fontFamily: 'Quicksand_700Bold',
    color: colors.success,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  completionTitleCompact: {
    fontSize: typography.sizes['2xl'],
    marginBottom: spacing[2],
  },
  completionMessage: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_400Regular',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  completionMessageCompact: {
    fontSize: typography.sizes.lg,
    marginBottom: spacing[3],
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
  starsTextCompact: {
    fontSize: typography.sizes.xl,
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
    minHeight: 44,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[8],
    borderRadius: radii.xl,
    justifyContent: 'center',
  },
  continueBtnText: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
});
