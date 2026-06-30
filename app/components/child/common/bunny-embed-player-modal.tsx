/**
 * Bunny Stream embed player (child-facing).
 * Loads the Bunny embed page directly in WebView; manual "I finished watching" when not yet completed.
 */

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { ConfirmModal } from '@/components/child/common/confirm-modal';
import { ThemedText } from '@/components/themed-text';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useExploreVideoWatch } from '@/hooks/exploreHook';
import { useUiStore } from '@/store/uiStore';
import {
  buildBunnyEmbedWebViewUrl,
  looksLikeBunnyExploreEmbedUrl,
} from '@/utils/bunnyExploreEmbed';
import { isExploreContentAlreadyWatched } from '@/utils/exploreWatchStatus';

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

/** Shared WebView settings for Bunny Stream embed pages on iOS/Android preview builds. */
const BUNNY_EMBED_WEBVIEW_PROPS = {
  originWhitelist: ['*'],
  allowsFullscreenVideo: true,
  allowsInlineMediaPlayback: true,
  mediaPlaybackRequiresUserAction: false,
  javaScriptEnabled: true,
  domStorageEnabled: true,
  mixedContentMode: 'always' as const,
  androidLayerType: 'hardware' as const,
  setSupportMultipleWindows: false,
  bounces: false,
  scalesPageToFit: true,
};

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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [webLoading, setWebLoading] = useState(true);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isRecordingWatch, setIsRecordingWatch] = useState(false);
  const [hasRecordedWatch, setHasRecordedWatch] = useState(false);
  const [wasAlreadyWatched, setWasAlreadyWatched] = useState(false);

  const PORTRAIT = ScreenOrientation.OrientationLock.PORTRAIT_UP;
  const LANDSCAPE = ScreenOrientation.OrientationLock.LANDSCAPE;

  const validEmbed = useMemo(
    () => (embedUrl && looksLikeBunnyExploreEmbedUrl(embedUrl) ? embedUrl.trim() : null),
    [embedUrl]
  );

  const webViewSource = useMemo(
    () =>
      validEmbed
        ? { uri: buildBunnyEmbedWebViewUrl(validEmbed) }
        : null,
    [validEmbed]
  );

  const handleWebViewError = useCallback(() => {
    setPlaybackError('The video could not load. Check your connection and try again.');
    setWebLoading(false);
  }, []);

  const handleWebViewLoadEnd = useCallback(() => {
    setWebLoading(false);
  }, []);

  /** Show manual finish only for first-time (not yet watched) explore videos. */
  const showFinishButton =
    Boolean(exploreContentId) && !wasAlreadyWatched && !hasRecordedWatch;

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
    setWebLoading(true);
    setPlaybackError(null);
    setHasRecordedWatch(false);
    setWasAlreadyWatched(false);
    setShowConfirmClose(false);
    setIsRecordingWatch(false);
  }, [open, validEmbed, exitFullscreen]);

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
      exitFullscreen();
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
    exitFullscreen,
    onClose,
  ]);

  const handleConfirmedClose = useCallback(() => {
    exitFullscreen();
    setShowConfirmClose(false);
    onClose();
  }, [exitFullscreen, onClose]);

  const skipCloseConfirm = wasAlreadyWatched || hasRecordedWatch;

  const handleCloseAttempt = useCallback(() => {
    if (skipCloseConfirm) {
      handleConfirmedClose();
      return;
    }
    setShowConfirmClose(true);
  }, [skipCloseConfirm, handleConfirmedClose]);

  if (!open) return null;

  const showPlayer = Boolean(webViewSource);

  return (
    <>
      <Modal
        visible={showPlayer}
        transparent
        animationType="slide"
        onRequestClose={handleCloseAttempt}
        statusBarTranslucent>
        <View style={[styles.overlay, isFullscreen && styles.overlayFullscreen]}>
          {isFullscreen ? (
            <View style={styles.fullscreenContainer}>
              {webViewSource ? (
                <WebView
                  {...BUNNY_EMBED_WEBVIEW_PROPS}
                  source={webViewSource}
                  style={StyleSheet.absoluteFill}
                  onLoadEnd={handleWebViewLoadEnd}
                  onError={handleWebViewError}
                  onHttpError={handleWebViewError}
                  accessibilityLabel={`Bunny embed playback for ${title}`}
                />
              ) : null}
              {webLoading && (
                <View style={styles.recordingOverlay}>
                  <ActivityIndicator size="large" color={colors.secondary} />
                  <ThemedText style={styles.recordingText}>Loading video...</ThemedText>
                </View>
              )}
              {isRecordingWatch && (
                <View style={styles.recordingOverlay}>
                  <ActivityIndicator size="large" color={colors.secondary} />
                  <ThemedText style={styles.recordingText}>Recording your progress...</ThemedText>
                </View>
              )}
              <Pressable
                style={styles.exitFullscreenBtn}
                onPress={exitFullscreen}
                accessibilityRole="button"
                accessibilityLabel="Exit fullscreen">
                <MaterialCommunityIcons name="fullscreen-exit" size={32} color={colors.textInverse} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.header}>
                <ThemedText style={styles.title} numberOfLines={1}>
                  {title}
                </ThemedText>
                <View style={styles.headerActions}>
                  <Pressable
                    style={styles.fullscreenBtn}
                    onPress={enterFullscreen}
                    accessibilityRole="button"
                    accessibilityLabel="Fullscreen">
                    <MaterialCommunityIcons name="fullscreen" size={24} color={colors.secondary} />
                  </Pressable>
                  <Pressable onPress={handleCloseAttempt} hitSlop={12} accessibilityLabel="Close">
                    <MaterialIcons name="close" size={26} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>

              {playbackError ? (
                <View style={styles.errorBanner}>
                  <ThemedText style={styles.errorText}>{playbackError}</ThemedText>
                </View>
              ) : null}

              <View style={styles.videoContainer}>
                {webViewSource ? (
                  <>
                    <WebView
                      {...BUNNY_EMBED_WEBVIEW_PROPS}
                      source={webViewSource}
                      style={StyleSheet.absoluteFill}
                      onLoadEnd={handleWebViewLoadEnd}
                      onError={handleWebViewError}
                      onHttpError={handleWebViewError}
                      accessibilityLabel={`Bunny embed playback for ${title}`}
                    />
                    {webLoading && (
                      <View style={styles.recordingOverlay}>
                        <ActivityIndicator size="large" color={colors.secondary} />
                        <ThemedText style={styles.recordingText}>Loading video...</ThemedText>
                      </View>
                    )}
                    {isRecordingWatch && (
                      <View style={styles.recordingOverlay}>
                        <ActivityIndicator size="large" color={colors.secondary} />
                        <ThemedText style={styles.recordingText}>Recording your progress...</ThemedText>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.loadingWrap}>
                    <ThemedText style={styles.loadingText}>
                      No Bunny embed URL is available for this video.
                    </ThemedText>
                  </View>
                )}
              </View>

              {showFinishButton ? (
                <Pressable
                  style={[styles.finishedBtn, isRecordingWatch && styles.finishedBtnDisabled]}
                  onPress={handleMarkFinished}
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
          )}
        </View>
      </Modal>

      <ConfirmModal
        open={showConfirmClose}
        title="Close Video?"
        message="Do you want to close this video? Tap I finished watching when you are done to save your progress."
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
  errorBanner: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.error,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  loadingText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textInverse,
    textAlign: 'center',
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
