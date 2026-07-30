/**
 * Shared expo-av audio session for CMS book player (intro BGM, content narration, reward SFX).
 *
 * Works in Expo Go and standalone iOS/Android builds — same expo-av API on both.
 * Re-applied before playback because iOS can reset the session after orientation locks.
 *
 * @see docs/CMS_INTRO_BACKGROUND_MUSIC_IOS_FIX.md
 */

import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

/** iOS landscape lock can reset AVAudioSession; settle before / after starting BGM. */
export const CMS_INTRO_BGM_IOS_SETTLE_MS = 450;
/** Watchdog: if still not playing after this, re-apply audio mode and playAsync. */
export const CMS_INTRO_BGM_PLAY_WATCHDOG_MS = 600;

let audioSessionEpoch = 0;

export function getCmsPlaybackAudioSessionEpoch(): number {
  return audioSessionEpoch;
}

/** Call after CMS landscape lock so intro BGM can re-arm on iOS. */
export function bumpCmsPlaybackAudioSessionEpoch(): number {
  audioSessionEpoch += 1;
  return audioSessionEpoch;
}

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

/**
 * Landscape lock then audio mode — order matters on iOS TestFlight.
 * Bumps epoch so intro BGM effects can restart after the session is healthy.
 */
export async function prepareCmsPlaybackAudioAfterOrientation(): Promise<number> {
  await ensureCmsPlaybackAudioMode();
  return bumpCmsPlaybackAudioSessionEpoch();
}

export function resetCmsPlaybackAudioModeForTests(): void {
  audioSessionEpoch = 0;
}

/** Whether CmsIntroPage should start looping BGM. */
export function shouldStartCmsIntroBackgroundMusic(input: {
  backgroundMusicUrl: string | null | undefined;
  isPreloading: boolean;
}): boolean {
  const url = typeof input.backgroundMusicUrl === 'string' ? input.backgroundMusicUrl.trim() : '';
  return Boolean(url) && !input.isPreloading;
}

export type CmsIntroBgmStatusAction = 'noop' | 'play' | 'replay' | 'retry_session';

/**
 * Decide how to keep intro BGM alive from an expo-av playback status snapshot.
 * Used by the player and by Jest e2e contracts (no native audio required).
 *
 * Do NOT map bare `!isPlaying` → play here — status ticks while buffering would spam playAsync.
 */
export function resolveCmsIntroBackgroundMusicStatusAction(input: {
  isLoaded: boolean;
  isPlaying?: boolean;
  didJustFinish?: boolean;
  /** True when watchdog fired and sound is loaded but not playing. */
  watchdogNotPlaying?: boolean;
}): CmsIntroBgmStatusAction {
  if (!input.isLoaded) return 'noop';
  if (input.didJustFinish) return 'replay';
  if (input.watchdogNotPlaying && !input.isPlaying) return 'retry_session';
  return 'noop';
}

/** Platform settle delay before first play (iOS only). */
export function getCmsIntroBackgroundMusicSettleMs(platformOs: string = Platform.OS): number {
  return platformOs === 'ios' ? CMS_INTRO_BGM_IOS_SETTLE_MS : 0;
}

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
