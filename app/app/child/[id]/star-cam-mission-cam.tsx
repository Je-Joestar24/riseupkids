import { useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { StarCamMissionCamScreen } from '@/components/child/starcammissioncam';
import { STAR_CAM_CATEGORY_PRESETS, type StarCamCategoryKey } from '@/components/child/starcamdynamicdisplay';
import { useStarCam } from '@/hooks/starCamHook';

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
    practiceMaterial,
    loadPracticeMaterial,
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

  useEffect(() => {
    if (!cameraPermission) {
      void requestCameraPermission();
    }
  }, [cameraPermission, requestCameraPermission]);

  useEffect(() => {
    if (!childId || !missionSlug) return;
    void loadPracticeMaterial(childId, missionSlug, 6);
  }, [childId, missionSlug, loadPracticeMaterial]);

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
  const targetLabel = currentTarget || practiceMaterial?.item?.target || practiceMaterial?.item?.displayText || 'object';

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
    if (!hasCameraPermission) {
      Alert.alert('Camera needed', 'Please allow camera permission first.');
      return;
    }
    try {
      const photo = await cameraRef.current?.takePictureAsync?.({
        quality: 0.7,
        skipProcessing: true,
      });
      if (!photo?.uri) {
        Alert.alert('Capture failed', 'Please try taking the photo again.');
        return;
      }
      if (__DEV__) {
        console.log('[StarCamDetectDebug][app] captured-photo', {
          hasUri: Boolean(photo?.uri),
          uriPreview: String(photo.uri).slice(0, 80),
        });
      }

      // Phase 1: keep it linear and deterministic for quick backend validation.
      const detection = await detectObject(
        childId,
        missionSlug,
        {
          uri: photo.uri,
          name: `star-cam-${Date.now()}.jpg`,
          type: 'image/jpeg',
        },
        { itemOrder: currentItemIndex + 1 }
      );

      if (!detection) {
        Alert.alert('Detection failed', 'No response from detector. Please try again.');
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
      }, 1200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Detection failed. Please try again.';
      Alert.alert('Error', message);
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
