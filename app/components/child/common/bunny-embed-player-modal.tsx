/**
 * Bunny Stream embed player (child-facing).
 * Watch-only WebView (no Bunny controls / native FS); manual "I finished watching" when needed.
 * @see docs/BUNNY_EMBED_WATCH_ONLY_PLAN.md
 */

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  StatusBar,
  View,
} from 'react-native';

import { BunnyEmbedWebView } from '@/components/child/common/bunny-embed-webview';
import { ConfirmModal } from '@/components/child/common/confirm-modal';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useExploreVideoWatch } from '@/hooks/exploreHook';
import { useVideoPlayerFullscreen } from '@/hooks/useVideoPlayerFullscreen';
import { useVideoFullscreenStage } from '@/hooks/useVideoFullscreenStage';
import { useUiStore } from '@/store/uiStore';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';
import { isExploreContentAlreadyWatched } from '@/utils/exploreWatchStatus';
import { restoreAndroidImmersiveDefault } from '@/utils/androidNavigationBar';
import { CMS_PLAYER_MODAL_ORIENTATIONS } from '@/utils/cmsPlayerOrientation';

export interface BunnyEmbedPlayerModalProps {
  open: boolean;
  onClose: () => void;
  embedUrl: string | null;
  title?: string;
  childId: string | null;
  exploreContentId?: string | null;
  videoType?: string;
  onVideoComplete?: () => void;
}

export function BunnyEmbedPlayerModal({
  open,
  onClose,
  embedUrl,
  title = 'Video',
  childId,
  exploreContentId,
  videoType,
  onVideoComplete,
}: BunnyEmbedPlayerModalProps) {
  const showDialog = useUiStore((s) => s.showDialog);
  const { markExploreVideoWatched, getExploreVideoWatchStatus } = useExploreVideoWatch(childId);

  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isRecordingWatch, setIsRecordingWatch] = useState(false);
  const [hasRecordedWatch, setHasRecordedWatch] = useState(false);
  const [wasAlreadyWatched, setWasAlreadyWatched] = useState(false);
  const { isFullscreen, enterFullscreen, exitFullscreen } = useVideoPlayerFullscreen(open);
  const { stageStyle: fullscreenStageStyle, onViewportLayout, overlayShiftStyle } =
    useVideoFullscreenStage(isFullscreen);

  const validEmbed = useMemo(
    () => (embedUrl && looksLikeBunnyExploreEmbedUrl(embedUrl) ? embedUrl.trim() : null),
    [embedUrl]
  );

  /** Show manual finish only for first-time (not yet watched) explore videos. */
  const showFinishButton =
    Boolean(exploreContentId) && !wasAlreadyWatched && !hasRecordedWatch;

  useEffect(() => {
    if (!open) return;
    setHasRecordedWatch(false);
    setWasAlreadyWatched(false);
    setShowConfirmClose(false);
    setIsRecordingWatch(false);
  }, [open, validEmbed]);

  useEffect(() => {
    if (!open || !childId || !exploreContentId) {
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
  }, [open, childId, exploreContentId, getExploreVideoWatchStatus]);

  const handleMarkFinished = useCallback(async () => {
    if (hasRecordedWatch || !childId || !exploreContentId) return;
    setIsRecordingWatch(true);
    setHasRecordedWatch(true);
    try {
      await markExploreVideoWatched(exploreContentId, 100, videoType);
      showDialog({
        message: 'Great job watching the video!',
        type: 'success',
        duration: 4000,
      });
      onVideoComplete?.();
      void exitFullscreen();
      onClose();
    } catch (e) {
      showDialog({
        message: (e as Error)?.message ?? 'Failed to record video watch',
        type: 'error',
        duration: 5000,
      });
      setHasRecordedWatch(false);
    } finally {
      setIsRecordingWatch(false);
    }
  }, [
    hasRecordedWatch,
    childId,
    exploreContentId,
    videoType,
    markExploreVideoWatched,
    showDialog,
    onVideoComplete,
    onClose,
    exitFullscreen,
  ]);

  const handleConfirmedClose = useCallback(() => {
    setShowConfirmClose(false);
    void exitFullscreen();
    onClose();
  }, [onClose, exitFullscreen]);

  const skipCloseConfirm = wasAlreadyWatched || hasRecordedWatch;

  const handleCloseAttempt = useCallback(() => {
    if (skipCloseConfirm) {
      handleConfirmedClose();
      return;
    }
    setShowConfirmClose(true);
  }, [skipCloseConfirm, handleConfirmedClose]);

  if (!open) return null;

  const showPlayer = Boolean(validEmbed) || Boolean(embedUrl);

  return (
    <>
      <Modal
        visible={showPlayer}
        transparent
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        supportedOrientations={
          Platform.OS === 'ios' ? [...CMS_PLAYER_MODAL_ORIENTATIONS] : undefined
        }
        onRequestClose={handleCloseAttempt}
        statusBarTranslucent
        navigationBarTranslucent={Platform.OS === 'android'}
        onShow={() => {
          if (isFullscreen) {
            StatusBar.setHidden(true, 'slide');
          }
          if (Platform.OS === 'android') {
            restoreAndroidImmersiveDefault();
          }
        }}>
        <View
          style={[
            styles.overlay,
            isFullscreen && styles.overlayFullscreen,
            overlayShiftStyle,
          ]}
        >
          {isFullscreen ? (
            <View style={styles.whiteFill} pointerEvents="none" />
          ) : null}
          <View style={[styles.card, isFullscreen && styles.cardFullscreen]}>
            {!isFullscreen ? (
              <View style={styles.header}>
                <ThemedText style={styles.title} numberOfLines={1}>
                  {title}
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
              onLayout={isFullscreen ? onViewportLayout : undefined}
            >
              <View
                style={
                  isFullscreen && fullscreenStageStyle
                    ? [styles.videoStage, fullscreenStageStyle]
                    : styles.videoStageFill
                }
              >
                <>
                  <BunnyEmbedWebView
                    embedUrl={validEmbed}
                    title={title}
                    style={StyleSheet.absoluteFill}
                    interactionMode="watchOnly"
                    playbackPreset="watchOnly"
                    showLoadingOverlay
                  />
                  {isRecordingWatch && (
                    <View style={styles.recordingOverlay}>
                      <ActivityIndicator size="large" color={colors.secondary} />
                      <ThemedText style={styles.recordingText}>Recording your progress...</ThemedText>
                    </View>
                  )}
                </>
              </View>
            </View>

            {showFinishButton && !isFullscreen ? (
              <Pressable
                style={[styles.finishedBtn, isRecordingWatch && styles.finishedBtnDisabled]}
                onPress={handleMarkFinished}
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
            message="Do you want to close this video? Tap I finished watching when you are done to save your progress."
            confirmLabel="Yes, Close"
            cancelLabel="Keep Watching"
            onConfirm={handleConfirmedClose}
            onCancel={() => setShowConfirmClose(false)}
          />
        </View>
      </Modal>
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
    position: 'relative',
  },
  overlayFullscreen: {
    backgroundColor: '#ffffff',
    padding: 0,
    justifyContent: 'center',
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
});
