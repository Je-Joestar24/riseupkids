import { CameraView } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { StarCamMapBackButton } from '@/components/child/starcamdynamicdisplay/StarCamMapBackButton';
import { StarCamMissionNotifications } from '@/components/child/starcammissioncam/StarCamMissionNotifications';
import { ThemedText } from '@/components/themed-text';
import { STARCAM_MAX_OBJECTS } from '@/constants/starCamMissionObjects';
import { getStarCamMissionCamLayout } from '@/utils/starCamMissionCamLayout';

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
  isReplayPromptDisabled?: boolean;
  /** True while vocabulary / LISTEN AGAIN audio is actively playing. */
  isPromptAudioPlaying?: boolean;
  notificationVisible?: boolean;
  notificationTone?: 'success' | 'retry' | 'checking';
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
  totalStars = STARCAM_MAX_OBJECTS,
  isLoadingCameraPermission,
  hasCameraPermission,
  isDetecting = false,
  isReplayPromptDisabled = false,
  isPromptAudioPlaying = false,
  notificationVisible = false,
  notificationTone = 'success',
  notificationTitle = '',
  notificationMessage = '',
  cameraRef,
  onCaptureAndDetect,
  onReplayPromptAudio,
  onBack,
}: StarCamMissionCamScreenProps) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = getStarCamMissionCamLayout(winW, winH, insets);
  const displayPrompt = promptText?.trim() || `Ca you find a ${targetLabel}?`;

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
                size={layout.starSize}
                color={filled ? STAR_FILLED_COLOR : STAR_EMPTY_COLOR}
                style={[styles.starIcon, !filled && styles.starIconEmpty]}
              />
            );
          })}
        </View>

        <View style={[styles.content, { paddingTop: layout.contentPaddingTop }]}>
        <View style={styles.promptBlock}>
          <ThemedText
            style={[
              styles.promptText,
              { fontSize: layout.promptFontSize, lineHeight: layout.promptLineHeight },
            ]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            {displayPrompt}
          </ThemedText>
          {hasPromptAudio && onReplayPromptAudio ? (
            <Pressable
              onPress={onReplayPromptAudio}
              disabled={isReplayPromptDisabled}
              accessibilityRole="button"
              accessibilityLabel="Replay vocabulary audio"
              accessibilityState={{ disabled: isReplayPromptDisabled, selected: isPromptAudioPlaying }}
              hitSlop={8}
              style={({ pressed }) => [
                styles.audioReplayButton,
                (isPromptAudioPlaying || (pressed && !isReplayPromptDisabled)) &&
                  styles.audioReplayButtonActive,
              ]}>
              <MaterialIcons name="volume-up" size={18} color="#FFFFFF" />
              <ThemedText style={styles.audioReplayText}>LISTEN AGAIN</ThemedText>
            </Pressable>
          ) : null}
        </View>

          <View
            style={[
              styles.magnifierWrap,
              { width: layout.magnifierSize, height: layout.magnifierSize },
            ]}
            pointerEvents="box-none">
            <View
              style={[
                styles.cameraCircle,
                { width: layout.cameraSize, height: layout.cameraSize },
              ]}>
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

            <View pointerEvents="none" style={[styles.magnifierImageWrap, { top: layout.magnifierOverlayTop }]}>
              <Image
                source={MAGNIFYING_GLASS}
                style={styles.magnifierImage}
                resizeMode="contain"
                accessibilityLabel="Magnifying glass overlay"
              />
            </View>
          </View>
        </View>

          <View style={[styles.footer, { paddingBottom: layout.footerPaddingBottom }]}>
          <Pressable
            onPress={onCaptureAndDetect}
            disabled={isLoadingCameraPermission || !hasCameraPermission || isDetecting}
            accessibilityRole="button"
            accessibilityLabel="Capture object and check detection"
            accessibilityState={{
              disabled: isLoadingCameraPermission || !hasCameraPermission || isDetecting,
              busy: isDetecting,
            }}
            style={({ pressed }) => [
              styles.captureButton,
              (isLoadingCameraPermission || !hasCameraPermission) && styles.captureButtonDisabled,
              (isDetecting || pressed) && styles.captureButtonActive,
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
    minHeight: 0,
    borderWidth: 8,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
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
  promptBlock: {
    zIndex: 10,
    elevation: 10,
    alignItems: 'center',
    width: '100%',
    position: 'relative',
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
  audioReplayButtonActive: {
    transform: [{ scale: 1.06 }],
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  audioReplayText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  magnifierWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cameraCircle: {
    position: 'absolute',
    top: '5%',
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
  magnifierImageWrap: {
    width: '80%',
    position: 'absolute',
    top: 150,
  },
  magnifierImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    width: '100%',
    flexShrink: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  captureButton: {
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
  captureButtonActive: {
    transform: [{ scale: 1.04 }],
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.3,
    fontSize: 16,
  },
});

export default StarCamMissionCamScreen;
