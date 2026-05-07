import { useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { StarCamMissionCamScreen } from '@/components/child/starcammissioncam';
import { STAR_CAM_CATEGORY_PRESETS, type StarCamCategoryKey } from '@/components/child/starcamdynamicdisplay';
import { useStarCam } from '@/hooks/starCamHook';

function formatDisplayLabel(value: string | null | undefined): string {
  const cleaned = String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.toUpperCase() : 'OBJECT';
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
    tone: 'success' | 'retry';
    title: string;
    message: string;
  }>({
    visible: false,
    tone: 'success',
    title: '',
    message: '',
  });
  const [isAdvancing, setIsAdvancing] = useState(false);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detectInFlightRef = useRef(false);

  useEffect(() => {
    if (!cameraPermission) {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  useEffect(() => {
    if (!childId || !missionSlug) return;
    void loadMissionFlow(childId, missionSlug);
  }, [childId, missionSlug, loadMissionFlow]);

  const categoryPreset = useMemo(() => {
    const safeKey = (categoryKey in STAR_CAM_CATEGORY_PRESETS ? categoryKey : 'reading') as StarCamCategoryKey;
    return STAR_CAM_CATEGORY_PRESETS[safeKey];
  }, [categoryKey]);

  useEffect(() => {
    if (huntItems.length === 0) return;
    setCurrentItemIndex((prev) => Math.min(prev, huntItems.length - 1));
  }, [huntItems]);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  const currentTarget = huntItems[currentItemIndex]?.target;
  const totalObjects = huntItems.length || 7;
  const targetLabel = useMemo(() => {
    if (!currentTarget) return 'OBJECT';
    const fromPractice = missionFlow?.flow?.practice?.items?.find((it) => it.target === currentTarget);
    return formatDisplayLabel(fromPractice?.displayText || fromPractice?.target || currentTarget || 'object');
  }, [currentTarget, missionFlow?.flow?.practice?.items]);

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
        title: 'Try again!',
        message: '',
      });
      notificationTimerRef.current = setTimeout(() => {
        setNotificationState((prev) => ({ ...prev, visible: false }));
      }, 1200);
      return;
    }
    detectInFlightRef.current = true;
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
          title: 'Try again!',
          message: '',
        });
        notificationTimerRef.current = setTimeout(() => {
          setNotificationState((prev) => ({ ...prev, visible: false }));
          detectInFlightRef.current = false;
        }, 1200);
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
        if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
        setNotificationState({
          visible: true,
          tone: 'retry',
          title: 'Try again!',
          message: '',
        });
        notificationTimerRef.current = setTimeout(() => {
          setNotificationState((prev) => ({ ...prev, visible: false }));
          detectInFlightRef.current = false;
        }, 1200);
        detectInFlightRef.current = false;
        return;
      }

      if (detection.result?.isMatch) {
        if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
        setIsAdvancing(true);
        setFoundCount((prev) => Math.max(prev, currentItemIndex + 1));
        const isLastObject = currentItemIndex >= totalObjects - 1;
        setNotificationState({
          visible: true,
          tone: 'success',
          title: 'Great job!',
          message: `Yes, that is a ${targetLabel}.`,
        });
        notificationTimerRef.current = setTimeout(() => {
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
        }, 1500);
        return;
      }
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      setNotificationState({
        visible: true,
        tone: 'retry',
        title: 'Try again!',
        message: '',
      });
      notificationTimerRef.current = setTimeout(() => {
        setNotificationState((prev) => ({ ...prev, visible: false }));
        detectInFlightRef.current = false;
      }, 1200);
    } catch (error: unknown) {
      // Suppress technical logs/alerts in child runtime UX.
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      setNotificationState({
        visible: true,
        tone: 'retry',
        title: 'Try again!',
        message: '',
      });
      notificationTimerRef.current = setTimeout(() => {
        setNotificationState((prev) => ({ ...prev, visible: false }));
      }, 1200);
      detectInFlightRef.current = false;
    }
  }, [childId, missionSlug, hasCameraPermission, detectObject, currentItemIndex, targetLabel, totalObjects, id, router, categoryKey, missionFlow?.mission?.title]);

  return (
    <StarCamMissionCamScreen
      targetLabel={targetLabel}
      backgroundColor={categoryPreset.gradient[1]}
      borderColor={categoryPreset.borderColor}
      accentColor={categoryPreset.borderColor}
      foundCount={foundCount}
      totalStars={totalObjects}
      isLoadingCameraPermission={isLoadingCameraPermission}
      hasCameraPermission={hasCameraPermission}
      isDetecting={isDetectingObject || isAdvancing}
      notificationVisible={notificationState.visible}
      notificationTone={notificationState.tone}
      notificationTitle={notificationState.title}
      notificationMessage={notificationState.message}
      cameraRef={cameraRef}
      onCaptureAndDetect={onCaptureAndDetect}
      onBack={onBack}
    />
  );
}
