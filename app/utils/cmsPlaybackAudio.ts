/**
 * Shared expo-av audio session for CMS book player (intro BGM, content narration, reward SFX).
 *
 * Works in Expo Go and standalone iOS/Android builds — same expo-av API on both.
 * Re-applied before playback because iOS can reset the session after orientation locks.
 */

import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

export async function ensureCmsPlaybackAudioMode(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // Best-effort — still attempt playback (Expo Go + dev builds may warn here).
  }
}

/** @deprecated No-op — audio mode is re-applied on each call for iOS reliability. */
export function resetCmsPlaybackAudioModeForTests(): void {}

/**
 * True when timed karaoke lines should render instead of static reading text.
 */
export function shouldShowCmsContentKaraokeLine(
  karaokeReady: boolean,
  wordsCount: number,
  visibleLineWordsCount: number
): boolean {
  return karaokeReady && wordsCount > 0 && visibleLineWordsCount > 0;
}
