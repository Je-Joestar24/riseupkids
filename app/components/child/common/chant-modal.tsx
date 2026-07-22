/**
 * Chant Modal
 * Child-facing: optional instruction video, optional reference audio, context-aware completion.
 */

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ConfirmModal } from '@/components/child/common/confirm-modal';
import { InstructionVideoPlayer } from '@/components/child/common/instruction-video-player';
import { buildPublicUrl, getCoverImageUrl } from '@/components/child/module/module-utils';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useContentProgress } from '@/hooks/contentProgressHook';
import { useExploreStore } from '@/store/exploreStore';
import { useUiStore } from '@/store/uiStore';
import type { PopulatedContentItem } from '@/services/moduleService';
import { isInstructionVideoBunnyEmbed, resolveInstructionVideoPlayback } from '@/utils/instructionVideoPlayback';
import { getChantCompletionLabels } from '@/utils/chantCompletionLabels';

function ChantReferenceAudioPlayer({
  uri,
  label,
  audioOnly = false,
}: {
  uri: string;
  label: string;
  audioOnly?: boolean;
}) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      sound?.unloadAsync().catch(() => {});
    };
  }, [sound]);

  const togglePlay = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
          return;
        }
        await sound.replayAsync();
        setIsPlaying(true);
        return;
      }
      const { sound: nextSound } = await Audio.Sound.createAsync({ uri });
      nextSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        setIsPlaying(status.isPlaying);
        if (status.didJustFinish) setIsPlaying(false);
      });
      setSound(nextSound);
      await nextSound.playAsync();
      setIsPlaying(true);
    } catch {
      // ignore
    }
  };

  if (audioOnly) {
    return (
      <View style={audioPlayerStyles.audioOnlyWrap}>
        <View style={audioPlayerStyles.audioOnlyIconWrap}>
          <MaterialCommunityIcons name="music-circle" size={56} color={colors.secondary} />
        </View>
        <ThemedText style={audioPlayerStyles.audioOnlyTitle}>Chant audio</ThemedText>
        <Pressable
          style={audioPlayerStyles.audioOnlyPlayer}
          onPress={() => void togglePlay()}
          accessibilityRole="button"
          accessibilityLabel={label}>
          <MaterialCommunityIcons
            name={isPlaying ? 'pause-circle' : 'play-circle'}
            size={48}
            color={colors.secondary}
          />
          <ThemedText style={audioPlayerStyles.audioOnlyLabel}>
            {isPlaying ? 'Pause chant audio' : 'Play chant audio'}
          </ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      style={audioPlayerStyles.wrap}
      onPress={() => void togglePlay()}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <MaterialCommunityIcons
        name={isPlaying ? 'pause-circle' : 'play-circle'}
        size={36}
        color={colors.secondary}
      />
      <ThemedText style={audioPlayerStyles.label}>{label}</ThemedText>
    </Pressable>
  );
}

const audioPlayerStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  label: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
  },
  audioOnlyWrap: {
    width: '100%',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  audioOnlyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioOnlyTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_700Bold',
    color: colors.text,
    textAlign: 'center',
  },
  audioOnlyPlayer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[3],
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
  },
  audioOnlyLabel: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textSecondary,
    textAlign: 'center',
    flexShrink: 1,
  },
});

export interface ChantModalProps {
  open: boolean;
  onClose: () => void;
  chant: PopulatedContentItem | null;
  childId: string | null;
  courseId?: string | null;
  onAfterComplete?: () => void;
}

export function ChantModal({
  open,
  onClose,
  chant,
  childId,
  courseId,
  onAfterComplete,
}: ChantModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isPhone = windowWidth < 600;
  const chantId = String(chant?._id ?? chant?._contentId ?? chant?.contentId ?? chant?.id ?? '');
  const showDialog = useUiStore((s) => s.showDialog);
  const applyChildStarReward = useExploreStore((s) => s.applyChildStarReward);

  const {
    startChant,
    getChantProgress,
    completeChant,
    getChantProgressCached,
    updateCourseContentProgress,
    clearError,
    isLoadingChant,
    error,
  } = useContentProgress({ childId, courseId });

  const [submitting, setSubmitting] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const progress = useMemo(() => {
    if (!chantId || chantId === 'undefined') return null;
    return getChantProgressCached(chantId) as {
      status?: string;
      chant?: { instructionVideo?: unknown; audio?: unknown };
      starsEarned?: number;
    } | null;
  }, [chantId, getChantProgressCached]);

  const instructionVideoMedia = useMemo(() => {
    return progress?.chant?.instructionVideo ?? chant?.instructionVideo ?? null;
  }, [progress, chant?.instructionVideo]);

  const referenceAudioUrl = useMemo(() => {
    const media = progress?.chant?.audio ?? chant?.audio;
    const url =
      typeof media === 'string'
        ? media
        : media && typeof media === 'object' && 'url' in media
          ? (media as { url?: string }).url
          : null;
    return buildPublicUrl(url);
  }, [progress, chant?.audio]);

  const coverImageUrl = useMemo(() => {
    const raw = progress?.chant?.coverImage ?? chant?.coverImage;
    if (!raw) return null;
    if (typeof raw === 'string') return getCoverImageUrl(raw);
    if (typeof raw === 'object' && raw && 'url' in raw) {
      return getCoverImageUrl((raw as { url?: string }).url ?? undefined);
    }
    return null;
  }, [progress, chant?.coverImage]);

  const hasInstructionVideo = useMemo(() => {
    const playback = resolveInstructionVideoPlayback(instructionVideoMedia, buildPublicUrl);
    return Boolean(playback.url);
  }, [instructionVideoMedia]);

  const completionLabels = useMemo(
    () =>
      getChantCompletionLabels({
        hasInstructionVideo,
        hasReferenceAudio: Boolean(referenceAudioUrl),
      }),
    [hasInstructionVideo, referenceAudioUrl]
  );

  const isAudioOnlyChant = Boolean(referenceAudioUrl) && !hasInstructionVideo && !coverImageUrl;
  const isAudioOnlyPhoneMode = isAudioOnlyChant && isPhone;
  const hasCoverOnly = !hasInstructionVideo && Boolean(coverImageUrl);

  const isBunnyEmbed = isInstructionVideoBunnyEmbed(instructionVideoMedia);

  const status = (progress?.status ?? 'not_started') as string;
  const isCompleted = status === 'completed';

  useEffect(() => {
    if (!open || !chantId || chantId === 'undefined' || !childId) return;
    clearError();
    startChant(chantId).then(() => getChantProgress(chantId));
  }, [open, chantId, childId, clearError, startChant, getChantProgress]);

  useEffect(() => {
    if (!open) {
      setShowConfirmClose(false);
    }
  }, [open]);

  const handleCloseAttempt = useCallback(() => {
    if (!isCompleted && !submitting) {
      setShowConfirmClose(true);
      return;
    }
    onClose();
  }, [isCompleted, submitting, onClose]);

  const handleConfirmedClose = useCallback(() => {
    setShowConfirmClose(false);
    onClose();
  }, [onClose]);

  const handleFinishedWatching = useCallback(async () => {
    if (!chantId || chantId === 'undefined' || !childId || isCompleted || submitting) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('timeSpent', '0');
      fd.append('metadata', JSON.stringify({ completionType: 'watch' }));

      const result = (await completeChant(chantId, fd)) as { starsEarned?: number } | null;
      const starsEarned = result?.starsEarned ?? progress?.starsEarned ?? 0;

      if (childId && starsEarned > 0) {
        applyChildStarReward(childId, { starsToAward: starsEarned });
      }

      if (courseId) {
        await updateCourseContentProgress(chantId, 'chant');
      }

      showDialog({
        message:
          starsEarned > 0
            ? `Completed! You earned ${starsEarned} star${starsEarned !== 1 ? 's' : ''}! 🎉`
            : 'Completed! Great job! 🎉',
        type: 'success',
        duration: 5000,
        onClose: () => {
          onAfterComplete?.();
          onClose();
        },
      });
    } catch (e) {
      showDialog({
        message: (e as Error)?.message ?? 'Failed to complete chant',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    chantId,
    childId,
    isCompleted,
    submitting,
    completeChant,
    progress?.starsEarned,
    courseId,
    updateCourseContentProgress,
    showDialog,
    applyChildStarReward,
    onAfterComplete,
    onClose,
  ]);

  if (!open) return null;

  return (
    <>
      <Modal
        visible
        transparent
        animationType="slide"
        onRequestClose={handleCloseAttempt}
        statusBarTranslucent>
        <View style={styles.overlay}>
          <View
            style={[
              styles.card,
              isAudioOnlyPhoneMode && styles.cardAudioOnly,
              hasCoverOnly && styles.cardCompact,
            ]}>
            <View style={styles.header}>
              <ThemedText style={styles.title} numberOfLines={1}>
                {chant?.title ?? 'Chant'}
              </ThemedText>
              <Pressable
                onPress={handleCloseAttempt}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Close">
                <MaterialIcons name="close" size={26} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={[styles.scroll, isAudioOnlyPhoneMode && styles.scrollAudioOnly]}
              contentContainerStyle={[
                styles.scrollContent,
                isAudioOnlyPhoneMode && styles.scrollContentAudioOnly,
              ]}
              showsVerticalScrollIndicator
              bounces
              nestedScrollEnabled>
              {isLoadingChant ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={colors.secondary} />
                </View>
              ) : (
                <>
                  {error ? (
                    <View style={styles.errorWrap}>
                      <ThemedText style={styles.errorText}>{error}</ThemedText>
                    </View>
                  ) : null}

                  {hasInstructionVideo ? (
                    <InstructionVideoPlayer
                      media={instructionVideoMedia}
                      title={String(chant?.title ?? 'Chant video')}
                      style={styles.videoWrap}
                      autoPlayMutedLoop={false}
                      showPlaybackButtons={!isBunnyEmbed}
                    />
                  ) : coverImageUrl ? (
                    <View style={hasCoverOnly ? styles.coverWrapCompact : styles.coverWrap}>
                      <Image
                        source={{ uri: coverImageUrl }}
                        style={styles.coverImage}
                        resizeMode="cover"
                        accessibilityLabel={chant?.title ? `${chant.title} cover` : 'Chant cover'}
                      />
                    </View>
                  ) : null}

                  {referenceAudioUrl ? (
                    <View style={[styles.audioBox, isAudioOnlyPhoneMode && styles.audioBoxOnly]}>
                      <ChantReferenceAudioPlayer
                        uri={referenceAudioUrl}
                        label="Tap to play chant audio"
                        audioOnly={isAudioOnlyPhoneMode}
                      />
                    </View>
                  ) : null}

                  {chant?.instructions ? (
                    <View style={styles.instructionsBox}>
                      <ThemedText style={styles.instructionsText}>{String(chant.instructions)}</ThemedText>
                    </View>
                  ) : null}

                  {isCompleted ? (
                    <View style={styles.completedWrap}>
                      <MaterialCommunityIcons name="check-circle" size={28} color={colors.success} />
                      <ThemedText style={styles.completedText}>
                        Completed! You earned {progress?.starsEarned ?? 0} stars.
                      </ThemedText>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>

            {!isCompleted && !isLoadingChant ? (
              <Pressable
                style={[styles.finishedBtn, submitting && styles.finishedBtnDisabled]}
                onPress={() => void handleFinishedWatching()}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={completionLabels.finishLabel}>
                <ThemedText style={styles.finishedBtnText}>
                  {submitting ? 'Saving…' : completionLabels.finishLabel}
                </ThemedText>
              </Pressable>
            ) : null}

            <View style={styles.footer}>
              <Pressable style={styles.closeBtn} onPress={handleCloseAttempt}>
                <ThemedText style={styles.closeBtnText}>Close</ThemedText>
              </Pressable>
            </View>
          </View>

          <ConfirmModal
            inline
            open={showConfirmClose}
            title="Close chant?"
            message={completionLabels.closeConfirmMessage}
            confirmLabel="Yes, Close"
            cancelLabel={completionLabels.keepGoingLabel}
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
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderBottomWidth: 3,
    borderBottomColor: colors.secondary,
  },
  cardAudioOnly: {
    maxWidth: 360,
  },
  cardCompact: {
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 2,
    borderBottomColor: colors.bgTertiary,
    gap: spacing[2],
  },
  title: {
    flex: 1,
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.primary,
  },
  scroll: {
    flexGrow: 0,
    maxHeight: 420,
  },
  scrollAudioOnly: {
    maxHeight: 320,
  },
  scrollContent: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[6],
  },
  scrollContentAudioOnly: {
    alignItems: 'center',
    paddingTop: spacing[5],
    gap: spacing[3],
  },
  loadingWrap: {
    padding: spacing[8],
    alignItems: 'center',
  },
  errorWrap: {
    padding: spacing[3],
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: radii.md,
  },
  errorText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.error,
  },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  coverWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.bgTertiary,
    overflow: 'hidden',
  },
  coverWrapCompact: {
    width: 168,
    alignSelf: 'center',
    aspectRatio: 1,
    backgroundColor: colors.bgTertiary,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  audioBox: {
    backgroundColor: colors.textInverse,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.lg,
  },
  audioBoxOnly: {
    width: '100%',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  instructionsBox: {
    backgroundColor: colors.textInverse,
    padding: spacing[4],
    borderRadius: radii.lg,
  },
  instructionsText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_400Regular',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  completedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    padding: spacing[3],
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: radii.md,
  },
  completedText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.success,
    flex: 1,
  },
  finishedBtn: {
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: radii.lg,
    backgroundColor: colors.success,
    alignItems: 'center',
  },
  finishedBtnDisabled: {
    opacity: 0.6,
  },
  finishedBtnText: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 2,
    borderTopColor: colors.bgTertiary,
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.borderSecondary,
  },
  closeBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.text,
  },
});
