/**
 * Chant Watch Modal
 * Child-facing: instruction video, optional reference audio, "I finished watching" completion.
 */

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ConfirmModal } from '@/components/child/common/confirm-modal';
import { InstructionVideoPlayer } from '@/components/child/common/instruction-video-player';
import { buildPublicUrl } from '@/components/child/module/module-utils';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useContentProgress } from '@/hooks/contentProgressHook';
import { useUiStore } from '@/store/uiStore';
import type { PopulatedContentItem } from '@/services/moduleService';
import { isInstructionVideoBunnyEmbed } from '@/utils/instructionVideoPlayback';

function ChantReferenceAudioPlayer({ uri, label }: { uri: string; label: string }) {
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
  const chantId = String(chant?._id ?? chant?._contentId ?? chant?.contentId ?? chant?.id ?? '');
  const showDialog = useUiStore((s) => s.showDialog);

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

  const hasInstructionVideo = Boolean(instructionVideoMedia);
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
          <View style={styles.card}>
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
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
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
                  ) : null}

                  {referenceAudioUrl ? (
                    <View style={styles.audioBox}>
                      <ChantReferenceAudioPlayer uri={referenceAudioUrl} label="Tap to play chant audio" />
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
                accessibilityLabel="I finished watching">
                <ThemedText style={styles.finishedBtnText}>
                  {submitting ? 'Saving…' : 'I finished watching'}
                </ThemedText>
              </Pressable>
            ) : null}

            <View style={styles.footer}>
              <Pressable style={styles.closeBtn} onPress={handleCloseAttempt}>
                <ThemedText style={styles.closeBtnText}>Close</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        open={showConfirmClose}
        title="Close chant?"
        message="Do you want to close this chant? Tap I finished watching when you are done to save your progress."
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
  scrollContent: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[6],
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
  audioBox: {
    backgroundColor: colors.textInverse,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.lg,
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
