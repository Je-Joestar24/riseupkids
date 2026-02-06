/**
 * Chant Recording Modal
 * Child-facing: instruction video, record chant, complete (no review)
 * Uses useContentProgress hook and GlobalDialog on completion
 */

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';

import { ThemedText } from '@/components/themed-text';
import { ConfirmModal } from '@/components/child/common/confirm-modal';
import { buildPublicUrl } from '@/components/child/module/module-utils';
import { colors } from '@/config/theme/colors';
import { radii } from '@/config/theme/radii';
import { spacing } from '@/config/theme/spacing';
import { typography } from '@/config/theme/typography';
import { useContentProgress } from '@/hooks/contentProgressHook';
import { useUiStore } from '@/store/uiStore';
import type { PopulatedContentItem } from '@/services/moduleService';

function ChantAudioPlayer({ uri }: { uri: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      sound?.unloadAsync().catch(() => {});
    };
  }, [sound]);

  const play = async () => {
    try {
      if (sound) {
        await sound.replayAsync();
        return;
      }
      const { sound: s } = await Audio.Sound.createAsync({ uri });
      setSound(s);
      await s.playAsync();
    } catch {
      // ignore
    }
  };

  return (
    <Pressable style={audioPlayerStyles.wrap} onPress={play}>
      <MaterialCommunityIcons name="play-circle" size={36} color={colors.secondary} />
      <ThemedText style={audioPlayerStyles.label}>Tap to play your recording</ThemedText>
    </Pressable>
  );
}

const audioPlayerStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  label: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_500Medium',
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordUri, setRecordUri] = useState<string | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = useMemo(() => {
    if (!chantId || chantId === 'undefined') return null;
    const cached = getChantProgressCached(chantId);
    return cached as { status?: string; chant?: { instructionVideo?: unknown }; starsEarned?: number } | null;
  }, [chantId, getChantProgressCached]);

  const instructionVideoUrl = useMemo(() => {
    const media = (progress as { chant?: { instructionVideo?: unknown } } | null)?.chant?.instructionVideo ?? chant?.instructionVideo;
    const url = typeof media === 'string' ? media : (media && typeof media === 'object' && 'url' in media) ? (media as { url?: string }).url : null;
    return buildPublicUrl(url);
  }, [progress, chant?.instructionVideo]);

  const status = (progress?.status ?? 'not_started') as string;
  const isCompleted = status === 'completed';

  const cleanupRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    recordingRef.current = null;
  }, []);

  const cleanupRecordedMedia = useCallback(() => {
    setRecordUri(null);
    setRecordSeconds(0);
  }, []);

  useEffect(() => {
    if (!open || !chantId || chantId === 'undefined' || !childId) return;
    clearError();
    startChant(chantId).then(() => getChantProgress(chantId));
  }, [open, chantId, childId]);

  useEffect(() => {
    if (!open) {
      cleanupRecording();
      cleanupRecordedMedia();
      setShowConfirmClose(false);
    }
  }, [open, cleanupRecording, cleanupRecordedMedia]);

  const handleCloseAttempt = useCallback(() => {
    if ((recordUri || isRecording) && !isCompleted) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  }, [recordUri, isRecording, isCompleted, onClose]);

  const handleConfirmedClose = useCallback(() => {
    setShowConfirmClose(false);
    cleanupRecordedMedia();
    cleanupRecording();
    onClose();
  }, [cleanupRecordedMedia, cleanupRecording, onClose]);

  const handleStartRecording = useCallback(async () => {
    if (!childId || isRecording) return;
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      cleanupRecordedMedia();
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (e) {
      showDialog({
        message: (e as Error)?.message ?? 'Microphone access denied',
        type: 'error',
        duration: 5000,
      });
    }
  }, [childId, isRecording, cleanupRecordedMedia, showDialog]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecording || !recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setRecordUri(uri ?? null);
    } catch {
      // ignore
    } finally {
      cleanupRecording();
    }
  }, [isRecording, cleanupRecording]);

  const handleComplete = useCallback(async () => {
    if (!recordUri || !chantId || chantId === 'undefined' || !childId) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      const ext = Platform.OS === 'ios' ? 'caf' : 'm4a';
      const mime = Platform.OS === 'ios' ? 'audio/x-caf' : 'audio/mp4';
      fd.append('recordedAudio', {
        uri: recordUri,
        type: mime,
        name: `chant-${chantId}-${childId}-${Date.now()}.${ext}`,
      } as unknown as Blob);
      fd.append('timeSpent', String(recordSeconds));
      fd.append('metadata', JSON.stringify({ recordedSeconds: recordSeconds }));

      const result = (await completeChant(chantId, fd)) as { starsEarned?: number } | null;
      const starsEarned = result?.starsEarned ?? progress?.starsEarned ?? 0;

      if (courseId) {
        await updateCourseContentProgress(chantId, 'chant');
      }

      showDialog({
        message: starsEarned > 0
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
  }, [recordUri, chantId, childId, recordSeconds, completeChant, progress?.starsEarned, courseId, updateCourseContentProgress, showDialog, onAfterComplete, onClose]);

  if (!open) return null;

  const statusColor =
    isCompleted ? colors.success : status === 'in_progress' ? colors.secondary : colors.textMuted;
  const statusLabel =
    isCompleted ? 'Completed' : status === 'in_progress' ? 'In progress' : 'Not started';

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
              <View style={styles.headerLeft}>
                <ThemedText style={styles.title} numberOfLines={1}>
                  {chant?.title ?? 'Chant'}
                </ThemedText>
                <View style={[styles.statusChip, { backgroundColor: statusColor }]}>
                  <ThemedText style={styles.statusChipText}>{statusLabel}</ThemedText>
                </View>
              </View>
              <Pressable onPress={handleCloseAttempt} hitSlop={12} accessibilityLabel="Close">
                <MaterialIcons name="close" size={26} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
              nestedScrollEnabled={true}>
              {isLoadingChant ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={colors.secondary} />
                </View>
              ) : (
                <>
                  {error && (
                    <View style={styles.errorWrap}>
                      <ThemedText style={styles.errorText}>{error}</ThemedText>
                    </View>
                  )}

                  {instructionVideoUrl && (
                    <View style={styles.videoWrap}>
                      <Video
                        source={{ uri: instructionVideoUrl }}
                        style={styles.video}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay
                        isMuted
                        isLooping
                      />
                    </View>
                  )}

                  {chant?.instructions && (
                    <View style={styles.instructionsBox}>
                      <ThemedText style={styles.instructionsTitle}>Instructions</ThemedText>
                      <ThemedText style={styles.instructionsText}>
                        {String(chant?.instructions ?? '')}
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.recordBox}>
                    <View style={styles.recordHeader}>
                      <ThemedText style={styles.recordTitle}>Record your chant</ThemedText>
                      <View style={[styles.timerChip, isRecording && styles.timerChipRecording]}>
                        <ThemedText style={[styles.timerText, isRecording && styles.timerTextRecording]}>
                          {recordSeconds}s
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.recordActions}>
                      <Pressable
                        style={[
                          styles.btn,
                          styles.recordBtn,
                          (isRecording || submitting || isCompleted) && styles.btnDisabled,
                        ]}
                        onPress={handleStartRecording}
                        disabled={isRecording || submitting || isCompleted}
                        accessibilityRole="button"
                        accessibilityLabel="Start recording">
                        <MaterialCommunityIcons name="microphone" size={24} color={colors.textInverse} />
                        <ThemedText style={styles.recordBtnText}>Record</ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.btn, styles.stopBtn, !isRecording && styles.btnDisabled]}
                        onPress={handleStopRecording}
                        disabled={!isRecording}
                        accessibilityRole="button"
                        accessibilityLabel="Stop recording">
                        <MaterialCommunityIcons name="stop" size={24} color={colors.orange} />
                        <ThemedText style={styles.stopBtnText}>Stop</ThemedText>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.btn,
                          (isRecording || submitting || (!recordUri && !isRecording)) && styles.btnDisabled,
                        ]}
                        onPress={() => {
                          cleanupRecording();
                          cleanupRecordedMedia();
                        }}
                        disabled={isRecording || submitting || (!recordUri && !isRecording)}
                        accessibilityRole="button"
                        accessibilityLabel="Re-record">
                        <ThemedText style={styles.rerecordBtnText}>Re-record</ThemedText>
                      </Pressable>
                    </View>
                    {recordUri && (
                      <View style={styles.yourRecordingWrap}>
                        <ThemedText style={styles.yourRecordingTitle}>
                          Your recording
                        </ThemedText>
                        <ChantAudioPlayer uri={recordUri} />
                        <ThemedText style={styles.recordedLabel}>
                          Ready? Tap Complete below to submit.
                        </ThemedText>
                      </View>
                    )}
                    {isCompleted && (
                      <View style={styles.completedWrap}>
                        <MaterialCommunityIcons name="check-circle" size={28} color={colors.success} />
                        <ThemedText style={styles.completedText}>
                          Completed! You earned {progress?.starsEarned ?? 0} stars.
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Pressable style={[styles.btn, styles.closeBtn]} onPress={handleCloseAttempt}>
                <ThemedText style={styles.closeBtnText}>Close</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.btn,
                  styles.completeBtn,
                  (!recordUri || isRecording || submitting || isCompleted) && styles.btnDisabled,
                ]}
                onPress={handleComplete}
                disabled={!recordUri || isRecording || submitting || isCompleted}>
                <MaterialCommunityIcons name="check" size={22} color={colors.textInverse} />
                <ThemedText style={styles.completeBtnText}>
                  {submitting ? 'Saving…' : 'Complete'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        open={showConfirmClose}
        title="Save your recording?"
        message="Do you want to close this activity? Your recording will be lost!"
        confirmLabel="Yes, Close"
        cancelLabel="Keep Recording"
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
    height: '70%',
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
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minWidth: 0,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: 'Quicksand_700Bold',
    color: colors.primary,
    flex: 1,
  },
  statusChip: {
    paddingVertical: 4,
    paddingHorizontal: spacing[2],
    borderRadius: radii.md,
  },
  statusChipText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
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
  video: {
    width: '100%',
    height: '100%',
  },
  instructionsBox: {
    backgroundColor: colors.textInverse,
    padding: spacing[4],
    borderRadius: radii.lg,
  },
  instructionsTitle: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.text,
    marginBottom: spacing[2],
  },
  instructionsText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_400Regular',
    color: colors.textSecondary,
    lineHeight: 24,
  },
  recordBox: {
    backgroundColor: colors.textInverse,
    padding: spacing[4],
    borderRadius: radii.lg,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  recordTitle: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.text,
  },
  timerChip: {
    backgroundColor: colors.bgTertiary,
    paddingVertical: 6,
    paddingHorizontal: spacing[3],
    borderRadius: radii.md,
  },
  timerChipRecording: {
    backgroundColor: colors.error,
  },
  timerText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_700Bold',
    color: colors.text,
  },
  timerTextRecording: {
    color: colors.textInverse,
  },
  recordActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radii.lg,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  recordBtn: {
    backgroundColor: colors.secondary,
  },
  recordBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
  stopBtn: {
    borderWidth: 2,
    borderColor: colors.orange,
  },
  stopBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.orange,
  },
  rerecordBtn: {},
  rerecordBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.orange,
  },
  yourRecordingWrap: {
    marginTop: spacing[3],
  },
  yourRecordingTitle: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.text,
    marginBottom: spacing[2],
  },
  recordedLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    marginTop: spacing[2],
  },
  completedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
    padding: spacing[3],
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: radii.md,
  },
  completedText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.success,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderTopWidth: 2,
    borderTopColor: colors.bgTertiary,
  },
  closeBtn: {
    borderWidth: 2,
    borderColor: colors.borderSecondary,
  },
  closeBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.text,
  },
  completeBtn: {
    backgroundColor: colors.success,
  },
  completeBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
});
