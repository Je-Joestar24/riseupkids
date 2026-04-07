import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BACKEND_ORIGIN } from '@/config';
import { StarCamMapBackButton } from '@/components/child/starcamdynamicdisplay/StarCamMapBackButton';

export interface StarCamMissionStartScreenProps {
  categoryHuntTitle: string;
  missionTitle: string;
  introText: string;
  introImageUrl: string | null;
  gradientColors?: readonly [string, string, string];
  borderColor?: string;
  accentColor?: string;
  loading?: boolean;
  onBack: () => void;
  onStartMission: () => void;
}

function darkenColor(color: string, amount = 0.2): string {
  const hex = color.trim();
  const hexMatch = /^#([0-9a-f]{6})$/i.exec(hex);
  if (hexMatch) {
    const raw = hexMatch[1];
    const r = Math.max(0, Math.floor(parseInt(raw.slice(0, 2), 16) * (1 - amount)));
    const g = Math.max(0, Math.floor(parseInt(raw.slice(2, 4), 16) * (1 - amount)));
    const b = Math.max(0, Math.floor(parseInt(raw.slice(4, 6), 16) * (1 - amount)));
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  const rgbMatch = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(hex);
  if (rgbMatch) {
    const r = Math.max(0, Math.floor(Number(rgbMatch[1]) * (1 - amount)));
    const g = Math.max(0, Math.floor(Number(rgbMatch[2]) * (1 - amount)));
    const b = Math.max(0, Math.floor(Number(rgbMatch[3]) * (1 - amount)));
    return `rgb(${r}, ${g}, ${b})`;
  }

  return color;
}

function lightenColor(color: string, amount = 0.2): string {
  const hex = color.trim();
  const hexMatch = /^#([0-9a-f]{6})$/i.exec(hex);
  if (hexMatch) {
    const raw = hexMatch[1];
    const r = Math.min(255, Math.floor(parseInt(raw.slice(0, 2), 16) + (255 - parseInt(raw.slice(0, 2), 16)) * amount));
    const g = Math.min(255, Math.floor(parseInt(raw.slice(2, 4), 16) + (255 - parseInt(raw.slice(2, 4), 16)) * amount));
    const b = Math.min(255, Math.floor(parseInt(raw.slice(4, 6), 16) + (255 - parseInt(raw.slice(4, 6), 16)) * amount));
    const toHex = (v: number) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  const rgbMatch = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(hex);
  if (rgbMatch) {
    const r0 = Number(rgbMatch[1]);
    const g0 = Number(rgbMatch[2]);
    const b0 = Number(rgbMatch[3]);
    const r = Math.min(255, Math.floor(r0 + (255 - r0) * amount));
    const g = Math.min(255, Math.floor(g0 + (255 - g0) * amount));
    const b = Math.min(255, Math.floor(b0 + (255 - b0) * amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  return color;
}

function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const safePath = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_ORIGIN}${safePath}`;
}

export const StarCamMissionStartScreen = memo(function StarCamMissionStartScreen({
  categoryHuntTitle,
  missionTitle,
  introText,
  introImageUrl,
  gradientColors = ['#F4EDD8', '#CFE3DF', '#A8D5CF'],
  borderColor = '#85C2B9',
  accentColor = '#85C2B9',
  loading = false,
  onBack,
  onStartMission,
}: StarCamMissionStartScreenProps) {
  const resolvedImageUrl = resolveImageUrl(introImageUrl);
  const defaultButtonColor = lightenColor(accentColor, 0.12);
  const pressedAccentColor = darkenColor(accentColor, 0.23);

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
          <ThemedText style={[styles.title, { color: accentColor }]}>{categoryHuntTitle || 'Category Hunt'}</ThemedText>

          <View style={styles.imageFrame}>
            {resolvedImageUrl ? (
              <Image
                source={{ uri: resolvedImageUrl }}
                style={styles.image}
                resizeMode="cover"
                accessibilityLabel={`${missionTitle || 'Mission'} image`}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <ThemedText style={[styles.placeholderLetter, { color: accentColor }]}>
                  {(missionTitle || '?').trim().charAt(0).toUpperCase() || '?'}
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={[styles.missionTitleBottom, { color: accentColor }]}>{missionTitle || 'Mission'}</ThemedText>
          <ThemedText style={[styles.subtitle, { color: accentColor }]}>{introText || 'Get ready for your mission!'}</ThemedText>

          <Pressable
            onPress={onStartMission}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Start mission"
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: pressed ? pressedAccentColor : defaultButtonColor },
              pressed && styles.startBtnPressed,
              loading && styles.startBtnDisabled,
            ]}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <ThemedText style={styles.startBtnText}>START MISSION</ThemedText>}
          </Pressable>
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
    borderRadius: 0,
    borderWidth: 8,
    borderColor: '#85C2B9',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 86,
  },
  title: {
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '800',
    fontSize: 46,
    color: '#85C2B9',
    letterSpacing: -0.6,
    lineHeight: 56,
  },
  imageFrame: {
    width: 292,
    height: 292,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 28,
    backgroundColor: '#EAEAEA',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLetter: {
    fontSize: 88,
    fontWeight: '800',
    color: '#85C2B9',
    lineHeight: 88,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 26,
    fontWeight: '700',
    fontSize: 19,
    color: '#85C2B9',
    lineHeight: 26,
    opacity: 0.95,
  },
  missionTitleBottom: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '700',
    fontSize: 22,
    color: '#85C2B9',
    lineHeight: 30,
  },
  startBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  startBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  startBtnDisabled: {
    opacity: 0.7,
  },
  startBtnText: {
    fontWeight: '800',
    fontSize: 18,
    color: '#FFFFFF',
  },
});

export default StarCamMissionStartScreen;
