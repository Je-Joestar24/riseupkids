import { useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  } = useStarCam();

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

  const targetLabel =
    missionFlow?.flow?.starCam?.items?.[0]?.target ||
    practiceMaterial?.item?.target ||
    practiceMaterial?.item?.displayText ||
    'object';

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
        { itemOrder: 1 }
      );

      if (!detection) {
        Alert.alert('Detection failed', 'No response from detector. Please try again.');
        return;
      }

      if (detection.result?.isMatch) {
        Alert.alert('Success', `${detection.ui?.message || 'Object detected successfully.'}`);
        return;
      }
      Alert.alert('Try again', `${detection.ui?.message || 'Object not matched yet.'}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Detection failed. Please try again.';
      Alert.alert('Error', message);
    }
  }, [childId, missionSlug, hasCameraPermission, detectObject]);

  return (
    <StarCamMissionCamScreen
      targetLabel={targetLabel}
      backgroundColor={categoryPreset.gradient[1]}
      borderColor={categoryPreset.borderColor}
      accentColor={categoryPreset.borderColor}
      foundCount={0}
      totalStars={7}
      isLoadingCameraPermission={isLoadingCameraPermission}
      hasCameraPermission={hasCameraPermission}
      isDetecting={isDetectingObject}
      cameraRef={cameraRef}
      onCaptureAndDetect={onCaptureAndDetect}
      onBack={onBack}
    />
  );
}
