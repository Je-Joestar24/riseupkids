import { CameraView } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarCamMapBackButton } from '@/components/child/starcamdynamicdisplay/StarCamMapBackButton';
import { ThemedText } from '@/components/themed-text';

export interface StarCamPracticeModeScreenProps {
  title: string;
  targetLabel: string;
  sampleImageUrl: string | null;
  gradientColors?: readonly [string, string, string];
  borderColor?: string;
  accentColor?: string;
  isLoadingCameraPermission: boolean;
  hasCameraPermission: boolean;
  onBack: () => void;
  onRequestCameraPermission: () => void;
}

export const StarCamPracticeModeScreen = memo(function StarCamPracticeModeScreen({
  title,
  targetLabel,
  sampleImageUrl,
  gradientColors = ['#F4EDD8', '#CFE3DF', '#A8D5CF'],
  borderColor = '#85C2B9',
  accentColor = '#85C2B9',
  isLoadingCameraPermission,
  hasCameraPermission,
  onBack,
  onRequestCameraPermission,
}: StarCamPracticeModeScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
      <View style={[styles.root, { borderColor }]}>
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1], gradientColors[2]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <StarCamMapBackButton borderColor={accentColor} onBack={onBack} />

        <View style={styles.content}>
          <ThemedText style={[styles.title, { color: accentColor }]}>{title}</ThemedText>

          <View style={styles.stack}>
            <View style={styles.block}>
              <ThemedText style={[styles.blockLabel, { color: accentColor }]}>Camera</ThemedText>
              <View style={styles.cameraFrame}>
                {isLoadingCameraPermission ? (
                  <View style={styles.centered}>
                    <ActivityIndicator color={accentColor} />
                    <ThemedText style={[styles.permissionText, { color: accentColor }]}>
                      Asking for camera permission...
                    </ThemedText>
                  </View>
                ) : hasCameraPermission ? (
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    mute
                    accessible
                    accessibilityLabel="Practice camera preview"
                  />
                ) : (
                  <View style={styles.centered}>
                    <ThemedText style={[styles.permissionText, { color: accentColor }]}>
                      Camera access is needed for practice mode.
                    </ThemedText>
                    <Pressable
                      onPress={onRequestCameraPermission}
                      accessibilityRole="button"
                      accessibilityLabel="Allow camera permission"
                      style={({ pressed }) => [
                        styles.permissionButton,
                        { backgroundColor: accentColor },
                        pressed && styles.permissionButtonPressed,
                      ]}>
                      <ThemedText style={styles.permissionButtonText}>ALLOW CAMERA</ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            <ThemedText style={[styles.targetText, { color: accentColor }]}>{targetLabel}</ThemedText>

            <View style={styles.block}>
              <ThemedText style={[styles.blockLabel, { color: accentColor }]}>Sample</ThemedText>
              <View style={styles.sampleWrap}>
                <View style={styles.sampleFrame}>
                {sampleImageUrl ? (
                  <Image
                    source={{ uri: sampleImageUrl }}
                    resizeMode="cover"
                    style={styles.sampleImage}
                    accessibilityLabel={`${targetLabel} sample image`}
                  />
                ) : (
                  <View style={styles.centered}>
                    <ThemedText style={[styles.placeholderText, { color: accentColor }]}>
                      No sample image yet.
                    </ThemedText>
                  </View>
                )}
                </View>
              </View>
            </View>
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
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  title: {
    textAlign: 'center',
    marginBottom: 0,
    fontWeight: '700',
    fontSize: 42,
    letterSpacing: -0.4,
    lineHeight: 42,
  },
  stack: {
    flex: 1,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingBottom: 16,
  },
  block: {
    width: '100%',
    height: '38%',
  },
  blockLabel: {
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '700',
    fontSize: 18,
  },
  cameraFrame: {
    width: '80%',
    flex: 1,
    marginHorizontal: 'auto',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#EDEDED',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  sampleFrame: {
    width: '80%',
    aspectRatio: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#EDEDED',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  sampleWrap: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleImage: {
    width: '100%',
    height: '100%',
  },
  targetText: {
    fontWeight: '700',
    fontSize: 34,
    lineHeight: 38,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  permissionText: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
  placeholderText: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 18,
  },
  permissionButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  permissionButtonPressed: {
    opacity: 0.85,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});

export default StarCamPracticeModeScreen;
