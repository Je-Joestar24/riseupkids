import { CameraView } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarCamMapBackButton } from '@/components/child/starcamdynamicdisplay/StarCamMapBackButton';
import { StarCamMissionNotifications } from '@/components/child/starcammissioncam/StarCamMissionNotifications';
import { ThemedText } from '@/components/themed-text';

const MAGNIFYING_GLASS = require('@/assets/images/magnifying_glass.png');
const STAR_FILLED_COLOR = '#FFD84D';
const STAR_EMPTY_COLOR = '#FFF3B0';

export interface StarCamMissionCamScreenProps {
  targetLabel: string;
  promptText?: string;
  hasPromptAudio?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  accentColor?: string;
  foundCount?: number;
  totalStars?: number;
  isLoadingCameraPermission: boolean;
  hasCameraPermission: boolean;
  isDetecting?: boolean;
  notificationVisible?: boolean;
  notificationTone?: 'success' | 'retry';
  notificationTitle?: string;
  notificationMessage?: string;
  cameraRef?: React.RefObject<CameraView | null>;
  onCaptureAndDetect: () => void;
  onReplayPromptAudio?: () => void;
  onBack: () => void;
}

export const StarCamMissionCamScreen = memo(function StarCamMissionCamScreen({
  targetLabel,
  promptText,
  hasPromptAudio = false,
  backgroundColor = '#CFE3DF',
  borderColor = '#85C2B9',
  accentColor = '#85C2B9',
  foundCount = 0,
  totalStars = 7,
  isLoadingCameraPermission,
  hasCameraPermission,
  isDetecting = false,
  notificationVisible = false,
  notificationTone = 'success',
  notificationTitle = '',
  notificationMessage = '',
  cameraRef,
  onCaptureAndDetect,
  onReplayPromptAudio,
  onBack,
}: StarCamMissionCamScreenProps) {
  const displayPrompt = promptText?.trim() || `Is this a ${targetLabel}?`;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={[styles.root, { borderColor, backgroundColor }]}>
        <StarCamMapBackButton borderColor={accentColor} onBack={onBack} />

        <View style={styles.starsRow}>
          {Array.from({ length: totalStars }).map((_, i) => {
            const filled = i < foundCount;
            return (
              <MaterialIcons
                key={`star-${i}`}
                name={filled ? 'star' : 'star-outline'}
                size={30}
                color={filled ? STAR_FILLED_COLOR : STAR_EMPTY_COLOR}
                style={[styles.starIcon, !filled && styles.starIconEmpty]}
              />
            );
          })}
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.promptText}>{displayPrompt}</ThemedText>
          {hasPromptAudio && onReplayPromptAudio ? (
            <Pressable
              onPress={onReplayPromptAudio}
              disabled={isDetecting}
              accessibilityRole="button"
              accessibilityLabel="Replay scan question audio"
              style={({ pressed }) => [
                styles.audioReplayButton,
                isDetecting && styles.audioReplayButtonDisabled,
                pressed && styles.audioReplayButtonPressed,
              ]}>
              <MaterialIcons name="volume-up" size={18} color="#FFFFFF" />
              <ThemedText style={styles.audioReplayText}>LISTEN AGAIN</ThemedText>
            </Pressable>
          ) : null}


          <View style={styles.magnifierWrap}>
            <View style={styles.cameraCircle}>
              {isLoadingCameraPermission ? (
                <View style={styles.centered}>
                  <ThemedText style={styles.placeholderText}>Preparing camera...</ThemedText>
                </View>
              ) : hasCameraPermission ? (
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                  mute
                  accessibilityLabel="Star cam circular camera preview"
                />
              ) : (
                <View style={styles.centered}>
                  <ThemedText style={styles.placeholderText}>Camera permission is required.</ThemedText>
                </View>
              )}
            </View>

            <Image source={MAGNIFYING_GLASS} style={styles.magnifierImage} resizeMode="contain" accessibilityLabel="Magnifying glass overlay" />
          </View>

          <Pressable
            onPress={onCaptureAndDetect}
            disabled={isLoadingCameraPermission || !hasCameraPermission || isDetecting}
            accessibilityRole="button"
            accessibilityLabel="Capture object and check detection"
            style={({ pressed }) => [
              styles.captureButton,
              (isLoadingCameraPermission || !hasCameraPermission || isDetecting) && styles.captureButtonDisabled,
              pressed && styles.captureButtonPressed,
            ]}>
            {isDetecting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.captureButtonText}>CHECK OBJECT</ThemedText>
            )}
          </Pressable>
        </View>
        <StarCamMissionNotifications
          visible={notificationVisible}
          tone={notificationTone}
          title={notificationTitle}
          message={notificationMessage}
        />
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4EDD8',
  },
  root: {
    flex: 1,
    borderWidth: 8,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 116,
    paddingBottom: 20,
  },
  starsRow: {
    position: 'absolute',
    top: 34,
    left: 0,
    right: 0,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  starIcon: {
    opacity: 1,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  starIconEmpty: {
    opacity: 0.95,
  },
  promptText: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 34,
    lineHeight: 40,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  audioReplayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
  },
  audioReplayButtonDisabled: {
    opacity: 0.55,
  },
  audioReplayButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  audioReplayText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  magnifierWrap: {
    width: '120%',
    maxWidth: 430,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  cameraCircle: {
    position: 'absolute',
    top: '5%',
    width: '75%',
    aspectRatio: 1,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#1F2A2A',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  placeholderText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
  magnifierImage: {
    width: '80%',    position: 'fixed',
   top: 150,
  },
  captureButton: {
    marginTop: 18,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: '#85C2B9',
    minWidth: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.3,
    fontSize: 16,
  },
});

export default StarCamMissionCamScreen;
