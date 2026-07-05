/**
 * Audio Assignment Recording Modal
 * Child-facing: instruction video, reference audio, record, submit (teacher review)
 * Uses useContentProgress hook and GlobalDialog on submit/approval
 */

import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
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

export interface AudioModalProps {
  open: boolean;
  onClose: () => void;
  audioAssignment: PopulatedContentItem | null;
  childId: string | null;
  courseId?: string | null;
  onAfterApproved?: () => void;
}

export function AudioModal({
  open,
  onClose,
  audioAssignment,
  childId,
  courseId,
  onAfterApproved,
}: AudioModalProps) {
  const audioId = String(
    audioAssignment?._id ??
    audioAssignment?._contentId ??
    audioAssignment?.contentId ??
    audioAssignment?.id ??
    ''
  );
  const showDialog = useUiStore((s) => s.showDialog);

  const {
    startAudioAssignment,
    getAudioProgress,
    submitAudioAssignment,
    getAudioProgressCached,
    updateCourseContentProgress,
    clearError,
    isLoadingAudio,
    error,
  } = useContentProgress({ childId, courseId });

  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordUri, setRecordUri] = useState<string | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = useMemo(() => {
    if (!audioId || audioId === 'undefined') return null;
    const cached = getAudioProgressCached(audioId);
    return cached as {
      status?: string;
      audioAssignment?: { instructionVideo?: unknown; referenceAudio?: unknown };
      adminFeedback?: string;
      starsEarned?: number;
    } | null;
  }, [audioId, getAudioProgressCached]);

  const instructionVideoMedia = useMemo(() => {
    return (
      (progress as { audioAssignment?: { instructionVideo?: unknown } } | null)?.audioAssignment
        ?.instructionVideo ?? audioAssignment?.instructionVideo ?? null
    );
  }, [progress, audioAssignment?.instructionVideo]);

  const referenceAudioUrl = useMemo(() => {
    const media =
      (progress as { audioAssignment?: { referenceAudio?: unknown } } | null)?.audioAssignment
        ?.referenceAudio ?? audioAssignment?.referenceAudio;
    const url = typeof media === 'string' ? media : (media && typeof media === 'object' && 'url' in media) ? (media as { url?: string }).url : null;
    return buildPublicUrl(url);
  }, [progress, audioAssignment?.referenceAudio]);

  const status = (progress?.status ?? 'not_started') as string;
  const isApproved = status === 'approved';
  const isSubmitted = status === 'submitted';
  const isRejected = status === 'rejected';
  const isRecordingSessionActive = isRecording || isRecordingPaused;

  const stopRecordTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecordTimer = useCallback(() => {
    stopRecordTimer();
    timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
  }, [stopRecordTimer]);

  const cleanupRecording = useCallback(() => {
    stopRecordTimer();
    setIsRecording(false);
    setIsRecordingPaused(false);
    recordingRef.current = null;
  }, [stopRecordTimer]);

  const cleanupRecordedMedia = useCallback(() => {
    setRecordUri(null);
    setRecordSeconds(0);
  }, []);

  useEffect(() => {
    if (!open || !audioId || !childId) return;
    clearError();
    startAudioAssignment(audioId).then(() => getAudioProgress(audioId));
  }, [open, audioId, childId]);

  useEffect(() => {
    if (!open) {
      cleanupRecording();
      cleanupRecordedMedia();
      setShowConfirmClose(false);
    }
  }, [open, cleanupRecording, cleanupRecordedMedia]);

  useEffect(() => {
    if (open && isApproved && courseId && audioId && audioId !== 'undefined') {
      updateCourseContentProgress(audioId, 'audioAssignment').then(() => {
        onAfterApproved?.();
      });
    }
  }, [open, isApproved, courseId, audioId, updateCourseContentProgress, onAfterApproved]);

  const handleCloseAttempt = useCallback(() => {
    if ((recordUri || isRecordingSessionActive) && !isApproved && !isRejected) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  }, [recordUri, isRecordingSessionActive, isApproved, isRejected, onClose]);

  const handleConfirmedClose = useCallback(() => {
    setShowConfirmClose(false);
    cleanupRecordedMedia();
    cleanupRecording();
    onClose();
  }, [cleanupRecordedMedia, cleanupRecording, onClose]);

  const handleStartRecording = useCallback(async () => {
    if (!childId || isRecordingSessionActive) return;
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
      setIsRecordingPaused(false);
      setRecordSeconds(0);
      startRecordTimer();
    } catch (e) {
      showDialog({
        message: (e as Error)?.message ?? 'Microphone access denied',
        type: 'error',
        duration: 5000,
      });
    }
  }, [childId, isRecordingSessionActive, cleanupRecordedMedia, showDialog, startRecordTimer]);

  const handlePauseRecording = useCallback(async () => {
    if (!isRecording || !recordingRef.current) return;
    try {
      await recordingRef.current.pauseAsync();
      stopRecordTimer();
      setIsRecording(false);
      setIsRecordingPaused(true);
    } catch (e) {
      showDialog({
        message: (e as Error)?.message ?? 'Could not pause recording',
        type: 'error',
        duration: 4000,
      });
    }
  }, [isRecording, showDialog, stopRecordTimer]);

  const handleResumeRecording = useCallback(async () => {
    if (!isRecordingPaused || !recordingRef.current) return;
    try {
      await recordingRef.current.startAsync();
      setIsRecording(true);
      setIsRecordingPaused(false);
      startRecordTimer();
    } catch (e) {
      showDialog({
        message: (e as Error)?.message ?? 'Could not resume recording',
        type: 'error',
        duration: 4000,
      });
    }
  }, [isRecordingPaused, showDialog, startRecordTimer]);

  const handleStopRecording = useCallback(async () => {
    if (!isRecordingSessionActive || !recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      setRecordUri(uri ?? null);
    } catch {
      // ignore
    } finally {
      cleanupRecording();
    }
  }, [isRecordingSessionActive, cleanupRecording]);

  const handleSubmit = useCallback(async () => {
    if (!recordUri || !audioId || !childId) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      const ext = Platform.OS === 'ios' ? 'caf' : 'm4a';
      const mime = Platform.OS === 'ios' ? 'audio/x-caf' : 'audio/mp4';
      fd.append('recordedAudio', {
        uri: recordUri,
        type: mime,
        name: `audio-assignment-${audioId}-${childId}-${Date.now()}.${ext}`,
      } as unknown as Blob);
      fd.append('timeSpent', String(recordSeconds));
      fd.append('metadata', JSON.stringify({ recordedSeconds: recordSeconds }));

      await submitAudioAssignment(audioId, fd);
      await getAudioProgress(audioId);

      showDialog({
        message: 'Submitted! Waiting for teacher review.',
        type: 'success',
        duration: 4000,
      });
    } catch (e) {
      showDialog({
        message: (e as Error)?.message ?? 'Failed to submit recording',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [recordUri, audioId, childId, recordSeconds, submitAudioAssignment, getAudioProgress, showDialog]);

  if (!open) return null;

  const statusColor =
    isApproved
      ? colors.success
      : isRejected
        ? colors.orange
        : isSubmitted
          ? colors.accent
          : status === 'in_progress'
            ? colors.secondary
            : colors.textMuted;
  const statusLabel =
    isApproved
      ? 'Approved'
      : isRejected
        ? "Let's Try Again!"
        : isSubmitted
          ? 'Submitted'
          : status === 'in_progress'
            ? 'In progress'
            : 'Not started';

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
                  {audioAssignment?.title ?? 'Audio Assignment'}
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
              {isLoadingAudio ? (
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

                  {instructionVideoMedia ? (
                    <View style={styles.videoSection}>
                      <InstructionVideoPlayer
                        media={instructionVideoMedia}
                        title={String(audioAssignment?.title ?? 'Instruction video')}
                        style={styles.videoWrap}
                        autoPlayMutedLoop={false}
                        showPlaybackButtons
                      />{/* 
                      <ThemedText style={styles.videoHint}>
                        Watch the video first. Pause or replay anytime to hear each question.
                      </ThemedText> */}
                    </View>
                  ) : null}

                  {audioAssignment?.instructions && (
                    <View style={styles.instructionsBox}>
{/*                       <ThemedText style={styles.instructionsTitle}>Instructions</ThemedText>
                      <ThemedText style={styles.instructionsText}>
                        {String(audioAssignment?.instructions ?? '')}
                      </ThemedText> */}
                      {referenceAudioUrl && (
                        <View style={styles.referenceAudioWrap}>
                          <ThemedText style={styles.referenceTitle}>Example Audio</ThemedText>
                          <AudioPlayer
                            uri={referenceAudioUrl}
                            label="Use Play and Pause to listen to the example."
                          />
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.recordBox}>
                    <View style={styles.recordHeader}>
                      <ThemedText style={styles.recordTitle}>Record your voice</ThemedText>
                      <View
                        style={[
                          styles.timerChip,
                          isRecording && styles.timerChipRecording,
                          isRecordingPaused && styles.timerChipPaused,
                        ]}>
                        <ThemedText
                          style={[
                            styles.timerText,
                            (isRecording || isRecordingPaused) && styles.timerTextRecording,
                          ]}>
                          {recordSeconds}s{isRecordingPaused ? ' · Paused' : ''}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.recordActions}>
                      <Pressable
                        style={[
                          styles.btn,
                          styles.recordActionBtn,
                          styles.recordBtn,
                          (isRecordingSessionActive || submitting || isSubmitted || isApproved) &&
                            styles.btnDisabled,
                        ]}
                        onPress={handleStartRecording}
                        disabled={
                          isRecordingSessionActive || submitting || isSubmitted || isApproved
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Start recording">
                        <MaterialCommunityIcons
                          name="microphone"
                          size={20}
                          color={colors.textInverse}
                        />
                        <ThemedText style={styles.recordBtnText} numberOfLines={1}>
                          Record
                        </ThemedText>
                      </Pressable>
                      {isRecordingPaused ? (
                        <Pressable
                          style={[styles.btn, styles.recordActionBtn, styles.pauseBtn]}
                          onPress={handleResumeRecording}
                          accessibilityRole="button"
                          accessibilityLabel="Resume recording">
                          <MaterialIcons name="play-arrow" size={20} color={colors.secondary} />
                          <ThemedText style={styles.pauseBtnText} numberOfLines={1}>
                            Resume
                          </ThemedText>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={[
                            styles.btn,
                            styles.recordActionBtn,
                            styles.pauseBtn,
                            !isRecording && styles.btnDisabled,
                          ]}
                          onPress={handlePauseRecording}
                          disabled={!isRecording}
                          accessibilityRole="button"
                          accessibilityLabel="Pause recording">
                          <MaterialIcons name="pause" size={20} color={colors.secondary} />
                          <ThemedText style={styles.pauseBtnText} numberOfLines={1}>
                            Pause
                          </ThemedText>
                        </Pressable>
                      )}
                      <Pressable
                        style={[
                          styles.btn,
                          styles.recordActionBtn,
                          styles.checkBtn,
                          !isRecordingSessionActive && styles.btnDisabled,
                        ]}
                        onPress={handleStopRecording}
                        disabled={!isRecordingSessionActive}
                        accessibilityRole="button"
                        accessibilityLabel="Check recording">
                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
                        <ThemedText style={styles.checkBtnText} numberOfLines={1}>
                          Done
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.btn,
                          styles.recordActionBtn,
                          styles.rerecordBtn,
                          (isRecordingSessionActive ||
                            submitting ||
                            isSubmitted ||
                            isApproved ||
                            (!recordUri && !isRecordingSessionActive)) &&
                            styles.btnDisabled,
                        ]}
                        onPress={() => {
                          cleanupRecording();
                          cleanupRecordedMedia();
                        }}
                        disabled={
                          isRecordingSessionActive ||
                          submitting ||
                          isSubmitted ||
                          isApproved ||
                          (!recordUri && !isRecordingSessionActive)
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Re-record">
                        <MaterialCommunityIcons name="refresh" size={20} color={colors.orange} />
                        <ThemedText style={styles.rerecordBtnText} numberOfLines={1}>
                          Again
                        </ThemedText>
                      </Pressable>
                    </View>
                    {recordUri && (
                      <View style={styles.yourRecordingWrap}>
                        <ThemedText style={styles.yourRecordingTitle}>
                          Your recording
                        </ThemedText>
                        <AudioPlayer
                          uri={recordUri}
                          label="Listen back to your recording before you submit."
                        />
                        <ThemedText style={styles.recordedLabel}>
                          Ready to submit? Tap Submit below to send for review.
                        </ThemedText>
                      </View>
                    )}
                    {isRejected && (
                      <View style={styles.rejectedWrap}>
                        <View style={styles.rejectedHeader}>
                          <View style={styles.rejectedIconWrap}>
                            <MaterialCommunityIcons
                              name="star"
                              size={20}
                              color={colors.textInverse}
                            />
                          </View>
                          <ThemedText style={styles.rejectedTitle}>Let's Try Again!</ThemedText>
                        </View>
                        <ThemedText style={styles.rejectedText}>
                          You're doing great! Just record it one more time and you'll get it!
                        </ThemedText>
                        {progress?.adminFeedback && (
                          <ThemedText style={styles.rejectedFeedback}>
                            Teacher's tip: {progress.adminFeedback}
                          </ThemedText>
                        )}
                      </View>
                    )}
                    {isApproved && (
                      <View style={styles.completedWrap}>
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={28}
                          color={colors.success}
                        />
                        <ThemedText style={styles.completedText}>
                          Approved! You earned {progress?.starsEarned ?? 0} stars.
                        </ThemedText>
                      </View>
                    )}
                    {isSubmitted && (
                      <View style={styles.submittedWrap}>
                        <ThemedText style={styles.submittedText}>
                          Submitted! Waiting for teacher/admin review.
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
                  styles.submitBtn,
                  (!recordUri || isRecordingSessionActive || submitting || isSubmitted || isApproved) &&
                    styles.btnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={
                  !recordUri || isRecordingSessionActive || submitting || isSubmitted || isApproved
                }>
                <MaterialCommunityIcons name="upload" size={22} color={colors.textInverse} />
                <ThemedText style={styles.submitBtnText}>
                  {submitting ? 'Submitting…' : 'Submit'}
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

function AudioPlayer({
  uri,
  label = 'Listen to the example audio below.',
}: {
  uri: string;
  label?: string;
}) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const unloadSound = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    void unloadSound();
  }, [uri, unloadSound]);

  useEffect(() => {
    return () => {
      void unloadSound();
    };
  }, [unloadSound]);

  const handlePlaybackStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setIsPlaying(false);
      soundRef.current?.setPositionAsync(0).catch(() => {});
    }
  }, []);

  const ensureSoundLoaded = useCallback(async () => {
    if (soundRef.current) return soundRef.current;
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false }, handlePlaybackStatus);
    soundRef.current = sound;
    return sound;
  }, [handlePlaybackStatus, uri]);

  const handlePlay = useCallback(async () => {
    if (isLoading || isPlaying) return;
    setIsLoading(true);
    try {
      const sound = await ensureSoundLoaded();
      await sound.playAsync();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [ensureSoundLoaded, isLoading, isPlaying]);

  const handlePause = useCallback(async () => {
    if (isLoading || !isPlaying || !soundRef.current) return;
    setIsLoading(true);
    try {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isPlaying]);

  return (
    <View style={styles.audioPlayerSection}>
      <ThemedText style={styles.audioPlayerHint}>{label}</ThemedText>
      <View style={styles.audioPlayerControls}>
        <Pressable
          style={[styles.audioControlBtn, styles.audioPlayBtn, (isPlaying || isLoading) && styles.btnDisabled]}
          onPress={() => void handlePlay()}
          disabled={isPlaying || isLoading}
          accessibilityRole="button"
          accessibilityLabel="Play audio">
          {isLoading && !isPlaying ? (
            <ActivityIndicator size={20} color={colors.textInverse} />
          ) : (
            <MaterialIcons name="play-arrow" size={22} color={colors.textInverse} />
          )}
          <ThemedText style={styles.audioPlayBtnText}>Play</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.audioControlBtn, styles.audioPauseBtn, (!isPlaying || isLoading) && styles.btnDisabled]}
          onPress={() => void handlePause()}
          disabled={!isPlaying || isLoading}
          accessibilityRole="button"
          accessibilityLabel="Pause audio">
          <MaterialIcons name="pause" size={22} color={colors.secondary} />
          <ThemedText style={styles.audioPauseBtnText}>Pause</ThemedText>
        </Pressable>
      </View>
    </View>
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
    height: '84%',
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
  videoSection: {
    gap: spacing[2],
  },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  videoHint: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
    lineHeight: 20,
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
    marginBottom: spacing[3],
  },
  referenceAudioWrap: {
    marginTop: spacing[2],
  },
  referenceTitle: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.text,
    marginBottom: spacing[2],
  },
  audioPlayerSection: {
    gap: spacing[2],
  },
  audioPlayerHint: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
  },
  audioPlayerControls: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  audioControlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radii.lg,
  },
  audioPlayBtn: {
    backgroundColor: colors.secondary,
  },
  audioPlayBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
  audioPauseBtn: {
    borderWidth: 2,
    borderColor: colors.secondary,
    backgroundColor: colors.textInverse,
  },
  audioPauseBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.secondary,
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
  timerChipPaused: {
    backgroundColor: colors.orange,
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
    flexWrap: 'nowrap',
    gap: spacing[1],
  },
  recordActionBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
    gap: spacing[1],
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
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
  checkBtn: {
    borderWidth: 2,
    borderColor: colors.success,
    backgroundColor: colors.textInverse,
  },
  checkBtnText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_700Bold',
    color: colors.success,
  },
  pauseBtn: {
    borderWidth: 2,
    borderColor: colors.secondary,
    backgroundColor: colors.textInverse,
  },
  pauseBtnText: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_700Bold',
    color: colors.secondary,
  },
  rerecordBtn: {
    borderWidth: 2,
    borderColor: colors.orange,
    backgroundColor: colors.textInverse,
  },
  rerecordBtnText: {
    fontSize: typography.sizes.sm,
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
  rejectedWrap: {
    marginTop: spacing[3],
    padding: spacing[4],
    backgroundColor: 'rgba(255, 183, 77, 0.15)',
    borderRadius: radii.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 152, 0, 0.4)',
  },
  rejectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  rejectedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectedTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: 'Quicksand_700Bold',
    color: colors.orange,
  },
  rejectedText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.text,
    lineHeight: 24,
  },
  rejectedFeedback: {
    fontSize: typography.sizes.sm,
    fontFamily: 'Quicksand_500Medium',
    color: colors.textSecondary,
    fontStyle: 'italic',
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
  submittedWrap: {
    marginTop: spacing[3],
    padding: spacing[3],
    backgroundColor: 'rgba(242, 175, 16, 0.15)',
    borderRadius: radii.md,
  },
  submittedText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_600SemiBold',
    color: colors.textSecondary,
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
  submitBtn: {
    backgroundColor: colors.accent,
  },
  submitBtnText: {
    fontSize: typography.sizes.base,
    fontFamily: 'Quicksand_700Bold',
    color: colors.textInverse,
  },
});
