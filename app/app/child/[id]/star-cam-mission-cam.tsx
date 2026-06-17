import { useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { StarCamMissionCamScreen } from '@/components/child/starcammissioncam';
import { getStarCamCategoryPreset } from '@/components/child/starcamdynamicdisplay';
import { BACKEND_ORIGIN } from '@/config';
import { useStarCam } from '@/hooks/starCamHook';
import { StarCamDetectObjectError } from '@/services/childStarCamService';

function formatDisplayLabel(value: string | null | undefined): string {
  const cleaned = String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.toUpperCase() : 'OBJECT';
}

function formatQuestionLabel(value: string): string {
  const cleaned = value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return cleaned || 'object';
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function resolveMediaUrl(url: string | null | undefined): string | null {
  const safeUrl = String(url || '').trim();
  if (!safeUrl) return null;
  if (/^(https?:|file:|content:|data:|blob:)/i.test(safeUrl)) return safeUrl;
  const safePath = safeUrl.startsWith('/') ? safeUrl : `/${safeUrl}`;
  return `${BACKEND_ORIGIN}${safePath}`;
}

function normalizeTarget(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function getScanFailureCopy(error: unknown): { title: string; message: string } {
  if (error instanceof StarCamDetectObjectError) {
    switch (error.code) {
      case 'STARCAM_UPLOAD_TIMEOUT':
      case 'STARCAM_VISION_TIMEOUT':
        return {
          title: 'Scan timed out',
          message: 'The scan took too long. Please try again.',
        };
      case 'STARCAM_NETWORK_ERROR':
        return {
          title: 'Scan failed',
          message: 'Please check your connection and try again.',
        };
      case 'STARCAM_VISION_UNAVAILABLE':
        return {
          title: 'Scan unavailable',
          message: 'Object scanning is not ready. Please try again later.',
        };
      case 'STARCAM_IMAGE_REQUIRED':
        return {
          title: 'Scan again',
          message: 'The camera did not send a photo. Please try again.',
        };
      case 'STARCAM_INVALID_STEP':
        return {
          title: 'Scan failed',
          message: 'This mission step is not ready. Please go back and try again.',
        };
      default:
        return {
          title: 'Scan failed',
          message: error.message || 'Please try scanning again.',
        };
    }
  }

  return {
    title: 'Scan failed',
    message: 'Please try scanning again.',
  };
}

export default function StarCamMissionCamRoute() {
  const { id, category, missionId } = useLocalSearchParams<{
    id: string;
    category?: string;
    missionId?: string;
  }>();
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const childId = id ?? null;
  const missionSlug = missionId ?? null;
  const categoryKey = (category || 'reading').toLowerCase();
  const hasCameraPermission = cameraPermission?.granted === true;
  const isLoadingCameraPermission = !cameraPermission;

  const {
    missionFlow,
    loadMissionFlow,
    detectObject,
    isDetectingObject,
    huntItems,
  } = useStarCam();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
  const [notificationState, setNotificationState] = useState<{
    visible: boolean;
    tone: 'success' | 'retry' | 'checking';
    title: string;
    message: string;
  }>({
    visible: false,
    tone: 'success',
    title: '',
    message: '',
  });
  const [isCheckingScan, setIsCheckingScan] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectInFlightRef = useRef(false);
  const audioRef = useRef<Audio.Sound | null>(null);
  const audioRequestIdRef = useRef(0);
  const autoPromptAudioKeyRef = useRef<string | null>(null);
  const isScreenActiveRef = useRef(true);
  const isAudioModeReadyRef = useRef(false);

  useEffect(() => {
    if (!cameraPermission) {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  useEffect(() => {
    if (!childId || !missionSlug) return;
    void loadMissionFlow(childId, missionSlug);
  }, [childId, missionSlug, loadMissionFlow]);

  const categoryPreset = useMemo(() => getStarCamCategoryPreset(categoryKey), [categoryKey]);

  useEffect(() => {
    if (huntItems.length === 0) return;
    setCurrentItemIndex((prev) => Math.min(prev, huntItems.length - 1));
  }, [huntItems]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  const unloadActiveAudio = useCallback(async () => {
    const activeSound = audioRef.current;
    audioRef.current = null;
    if (!activeSound) return;
    try {
      await activeSound.stopAsync();
    } catch {
      // The sound may already be stopped or unloaded.
    }
    try {
      await activeSound.unloadAsync();
    } catch {
      // The sound may already be unloaded.
    }
  }, []);

  const playAudio = useCallback(
    async (url: string | null | undefined, options: { waitForFinish?: boolean; fallbackMs?: number } = {}) => {
      const requestId = audioRequestIdRef.current + 1;
      audioRequestIdRef.current = requestId;
      const safeUrl = String(url || '').trim();
      const fallbackMs = options.fallbackMs ?? 0;
      if (!safeUrl) {
        if (fallbackMs > 0) await wait(fallbackMs);
        return;
      }

      try {
        if (!isAudioModeReadyRef.current) {
          try {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              shouldDuckAndroid: true,
              staysActiveInBackground: false,
            });
          } catch {
            // Audio mode can fail on some Expo Go runtimes; playback should still be attempted.
          }
          isAudioModeReadyRef.current = true;
        }
        await unloadActiveAudio();
        if (!isScreenActiveRef.current || requestId !== audioRequestIdRef.current) return;
        const { sound } = await Audio.Sound.createAsync({ uri: safeUrl }, { shouldPlay: true, volume: 1 });
        if (!isScreenActiveRef.current || requestId !== audioRequestIdRef.current) {
          await sound.unloadAsync();
          return;
        }
        audioRef.current = sound;

        if (!options.waitForFinish) {
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              if (audioRef.current === sound) {
                void unloadActiveAudio();
              } else {
                void sound.unloadAsync();
              }
            }
          });
          return;
        }

        const status = await sound.getStatusAsync();
        const safetyTimeoutMs =
          status.isLoaded && typeof status.durationMillis === 'number' && status.durationMillis > 0
            ? Math.max(1500, status.durationMillis - (status.positionMillis ?? 0) + 1500)
            : Math.max(fallbackMs, 30000);

        await Promise.race([
          new Promise<void>((resolve) => {
            sound.setOnPlaybackStatusUpdate((nextStatus) => {
              if (!nextStatus.isLoaded || nextStatus.didJustFinish) resolve();
            });
          }),
          wait(safetyTimeoutMs),
        ]);
        if (audioRef.current === sound) {
          await unloadActiveAudio();
        } else {
          await sound.unloadAsync();
        }
      } catch {
        if (fallbackMs > 0) await wait(fallbackMs);
      }
    },
    [unloadActiveAudio]
  );

  useEffect(() => {
    isScreenActiveRef.current = true;
    return () => {
      isScreenActiveRef.current = false;
      audioRequestIdRef.current += 1;
      void unloadActiveAudio();
    };
  }, [unloadActiveAudio]);

  const currentTarget = huntItems[currentItemIndex]?.target;
  const currentItem = huntItems[currentItemIndex] || null;
  const currentPracticeItem = useMemo(() => {
    const safeTarget = normalizeTarget(currentTarget);
    if (!safeTarget) return null;
    return (
      missionFlow?.flow?.practice?.items?.find((it) => normalizeTarget(it.target) === safeTarget) ??
      null
    );
  }, [currentTarget, missionFlow?.flow?.practice?.items]);
  const totalObjects = huntItems.length || 7;
  const targetLabel = useMemo(() => {
    if (!currentTarget) return 'OBJECT';
    return formatDisplayLabel(currentPracticeItem?.displayText || currentPracticeItem?.target || currentTarget || 'object');
  }, [currentPracticeItem?.displayText, currentPracticeItem?.target, currentTarget]);
  const questionPrompt = useMemo(() => {
    const explicit = currentItem?.questionText || currentItem?.prompt;
    if (explicit?.trim()) return explicit.trim();
    return `Is this a ${formatQuestionLabel(targetLabel)}?`;
  }, [currentItem?.prompt, currentItem?.questionText, targetLabel]);
  const questionAudioUrl = resolveMediaUrl(
    currentItem?.questionAudioUrl || currentPracticeItem?.introAudioUrl || currentPracticeItem?.audioUrl || null
  );
  const tryAgainAudioUrl = resolveMediaUrl(currentItem?.tryAgainAudioUrl || currentPracticeItem?.tryAgainAudioUrl || null);
  const successAudioUrl = resolveMediaUrl(currentItem?.successAudioUrl || currentPracticeItem?.successAudioUrl || null);
  const tryAgainText = currentItem?.tryAgainText || currentItem?.fail || '';
  const successText = currentItem?.successText || currentItem?.success || '';

  useEffect(() => {
    if (!questionAudioUrl) return;
    const autoPromptKey = `${missionSlug || ''}:${currentItemIndex}:${questionAudioUrl}`;
    if (autoPromptAudioKeyRef.current === autoPromptKey) return;
    autoPromptAudioKeyRef.current = autoPromptKey;
    void playAudio(questionAudioUrl);
  }, [currentItemIndex, missionSlug, playAudio, questionAudioUrl]);

  const replayQuestionAudio = useCallback(() => {
    if (!questionAudioUrl) return;
    audioRequestIdRef.current += 1;
    void (async () => {
      await unloadActiveAudio();
      if (!isScreenActiveRef.current) return;
      await playAudio(questionAudioUrl);
    })();
  }, [playAudio, questionAudioUrl, unloadActiveAudio]);

  const playQuestionAudioForScan = useCallback(() => {
    if (!questionAudioUrl) return wait(700);
    audioRequestIdRef.current += 1;
    return playAudio(questionAudioUrl, { waitForFinish: true, fallbackMs: 2500 });
  }, [playAudio, questionAudioUrl]);

  const onBack = () => {
    if (!id) {
      router.back();
      return;
    }
    router.replace(
      `/child/${id}/star-cam-practice-mode?category=${encodeURIComponent(categoryKey)}&missionId=${encodeURIComponent(missionSlug || '')}` as never
    );
  };

  const onCaptureAndDetect = useCallback(async () => {
    if (!childId || !missionSlug) return;
    if (detectInFlightRef.current) return;
    if (!hasCameraPermission) {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      setNotificationState({
        visible: true,
        tone: 'retry',
        title: 'Camera needed',
        message: 'Please allow camera access to scan objects.',
      });
      notificationTimerRef.current = setTimeout(() => {
        setNotificationState((prev) => ({ ...prev, visible: false }));
      }, 1200);
      return;
    }
    detectInFlightRef.current = true;
    setIsCheckingScan(true);
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    setNotificationState({
      visible: true,
      tone: 'checking',
      title: '?',
      message: questionPrompt,
    });
    const questionAudioPromise = playQuestionAudioForScan();
    try {
      const photo = await cameraRef.current?.takePictureAsync?.({
        quality: 0.45,
        skipProcessing: true,
      });
      if (!photo?.uri) {
        if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
        setNotificationState({
          visible: true,
          tone: 'retry',
          title: 'Scan again',
          message: 'The camera did not capture a photo.',
        });
        await questionAudioPromise;
        notificationTimerRef.current = setTimeout(() => {
          setNotificationState((prev) => ({ ...prev, visible: false }));
          setIsCheckingScan(false);
          detectInFlightRef.current = false;
        }, 1200);
        setIsCheckingScan(false);
        detectInFlightRef.current = false;
        return;
      }
      // Reduce payload for faster network + Google Vision processing.
      const optimizedPhoto = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 640 } }],
        { compress: 0.55, format: SaveFormat.JPEG }
      );
      // Debug logs intentionally suppressed for child runtime UX.

      // Phase 1: keep it linear and deterministic for quick backend validation.
      const detection = await detectObject(
        childId,
        missionSlug,
        {
          uri: optimizedPhoto.uri,
          name: `star-cam-${Date.now()}.jpg`,
          type: 'image/jpeg',
        },
        { itemOrder: currentItemIndex + 1 }
      );

      if (!detection) {
        await questionAudioPromise;
        if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
        setNotificationState({
          visible: true,
          tone: 'retry',
          title: 'Scan failed',
          message: 'Please try scanning again.',
        });
        notificationTimerRef.current = setTimeout(() => {
          setNotificationState((prev) => ({ ...prev, visible: false }));
          setIsCheckingScan(false);
          detectInFlightRef.current = false;
        }, 1200);
        setIsCheckingScan(false);
        detectInFlightRef.current = false;
        return;
      }

      await questionAudioPromise;
      const feedbackAudioUrl = resolveMediaUrl(detection.ui?.audioUrl);
      if (detection.result?.isMatch) {
        if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
        setIsAdvancing(true);
        setIsCheckingScan(false);
        setFoundCount((prev) => Math.max(prev, currentItemIndex + 1));
        const isLastObject = currentItemIndex >= totalObjects - 1;
        setNotificationState({
          visible: true,
          tone: 'success',
          title: detection.ui?.title || 'Great job!',
          message: detection.ui?.message || successText || `Yes, that is a ${targetLabel}.`,
        });
        await playAudio(feedbackAudioUrl || successAudioUrl, { waitForFinish: true, fallbackMs: 1500 });
        setNotificationState((prev) => ({ ...prev, visible: false }));
        if (isLastObject && id) {
          setFoundCount(totalObjects);
          router.replace(
            `/child/${id}/star-cam-mission-success?category=${encodeURIComponent(categoryKey)}&missionId=${encodeURIComponent(missionSlug || '')}&title=${encodeURIComponent(missionFlow?.mission?.title || '')}` as never
          );
        } else {
          setCurrentItemIndex((prev) => Math.min(prev + 1, Math.max(0, totalObjects - 1)));
        }
        setIsAdvancing(false);
        detectInFlightRef.current = false;
        return;
      }
      setIsCheckingScan(false);
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      setNotificationState({
        visible: true,
        tone: 'retry',
        title: detection.ui?.title || 'Try again!',
        message: detection.ui?.message || tryAgainText,
      });
      await playAudio(feedbackAudioUrl || tryAgainAudioUrl, { waitForFinish: true, fallbackMs: 1200 });
      setNotificationState((prev) => ({ ...prev, visible: false }));
      detectInFlightRef.current = false;
    } catch (error) {
      await questionAudioPromise;
      setIsCheckingScan(false);
      const scanFailure = getScanFailureCopy(error);
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      setNotificationState({
        visible: true,
        tone: 'retry',
        title: scanFailure.title,
        message: scanFailure.message,
      });
      notificationTimerRef.current = setTimeout(() => {
        setNotificationState((prev) => ({ ...prev, visible: false }));
      }, 1800);
      detectInFlightRef.current = false;
    }
  }, [childId, missionSlug, hasCameraPermission, detectObject, currentItemIndex, targetLabel, totalObjects, id, router, categoryKey, missionFlow?.mission?.title, playAudio, playQuestionAudioForScan, questionPrompt, successAudioUrl, successText, tryAgainAudioUrl, tryAgainText]);

  return (
    <StarCamMissionCamScreen
      targetLabel={targetLabel}
      promptText={questionPrompt}
      hasPromptAudio={Boolean(questionAudioUrl)}
      backgroundColor={categoryPreset.gradient[1]}
      borderColor={categoryPreset.borderColor}
      accentColor={categoryPreset.borderColor}
      foundCount={foundCount}
      totalStars={totalObjects}
      isLoadingCameraPermission={isLoadingCameraPermission}
      hasCameraPermission={hasCameraPermission}
      isDetecting={isCheckingScan || isDetectingObject || isAdvancing}
      isReplayPromptDisabled={isCheckingScan || isAdvancing}
      notificationVisible={notificationState.visible}
      notificationTone={notificationState.tone}
      notificationTitle={notificationState.title}
      notificationMessage={notificationState.message}
      cameraRef={cameraRef}
      onCaptureAndDetect={onCaptureAndDetect}
      onReplayPromptAudio={replayQuestionAudio}
      onBack={onBack}
    />
  );
}
