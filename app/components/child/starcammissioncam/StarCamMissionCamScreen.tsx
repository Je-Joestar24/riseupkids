import { CameraView } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarCamMapBackButton } from '@/components/child/starcamdynamicdisplay/StarCamMapBackButton';
import { ThemedText } from '@/components/themed-text';

const MAGNIFYING_GLASS = require('@/assets/images/magnifying_glass.png');

export interface StarCamMissionCamScreenProps {
  targetLabel: string;
  backgroundColor?: string;
  borderColor?: string;
  accentColor?: string;
  foundCount?: number;
  totalStars?: number;
  isLoadingCameraPermission: boolean;
  hasCameraPermission: boolean;
  onBack: () => void;
}

export const StarCamMissionCamScreen = memo(function StarCamMissionCamScreen({
  targetLabel,
  backgroundColor = '#CFE3DF',
  borderColor = '#85C2B9',
  accentColor = '#85C2B9',
  foundCount = 0,
  totalStars = 7,
  isLoadingCameraPermission,
  hasCameraPermission,
  onBack,
}: StarCamMissionCamScreenProps) {
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
                color="#FFFFFF"
                style={styles.starIcon}
              />
            );
          })}
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.promptText}>{`Can you find a ${targetLabel}?`}</ThemedText>

          <View style={styles.magnifierWrap}>
            <View style={styles.cameraCircle}>
              {isLoadingCameraPermission ? (
                <View style={styles.centered}>
                  <ThemedText style={styles.placeholderText}>Preparing camera...</ThemedText>
                </View>
              ) : hasCameraPermission ? (
                <CameraView style={styles.camera} facing="back" mute accessibilityLabel="Star cam circular camera preview" />
              ) : (
                <View style={styles.centered}>
                  <ThemedText style={styles.placeholderText}>Camera permission is required.</ThemedText>
                </View>
              )}
            </View>

            <Image source={MAGNIFYING_GLASS} style={styles.magnifierImage} resizeMode="contain" accessibilityLabel="Magnifying glass overlay" />
          </View>
        </View>
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
    opacity: 0.45,
  },
  promptText: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 36,
    lineHeight: 42,
    color: '#FFFFFF',
    marginBottom: 16,
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
    width: '80%',
    position: 'fixed',
    top: 150,
  },
});

export default StarCamMissionCamScreen;
