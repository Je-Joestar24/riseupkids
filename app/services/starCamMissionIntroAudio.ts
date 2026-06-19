import { Audio } from 'expo-av';

import { resolveStarCamMediaUrl } from '@/services/starCamMissionMedia';

let sound: Audio.Sound | null = null;
let activeAssetKey: string | null = null;
let playRequestId = 0;
let audioModeReady = false;

/** Canonical identity for intro audio — stable across remote and cached file URIs. */
export function getStarCamMissionIntroAudioAssetKey(
  url: string | null | undefined
): string | null {
  return resolveStarCamMediaUrl(url);
}

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // Audio mode can fail on some runtimes; still attempt playback.
  }
  audioModeReady = true;
}

async function unloadActiveSound(): Promise<void> {
  const active = sound;
  sound = null;
  if (!active) return;
  try {
    await active.stopAsync();
  } catch {
    // already stopped
  }
  try {
    await active.unloadAsync();
  } catch {
    // already unloaded
  }
}

/**
 * Play mission intro audio once per asset. Skips restart when the same asset is
 * already playing (e.g. remote URL during preload → cached file on mission start).
 */
export async function ensureStarCamMissionIntroAudio(
  playableUri: string,
  assetKey: string
): Promise<void> {
  const uri = String(playableUri || '').trim();
  const key = String(assetKey || '').trim();
  if (!uri || !key) return;

  if (activeAssetKey === key && sound) {
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) return;
        const position = status.positionMillis ?? 0;
        if (position > 0 && !status.didJustFinish) {
          await sound.playAsync();
          return;
        }
      }
    } catch {
      // Fall through and start fresh below.
    }
  }

  const requestId = playRequestId + 1;
  playRequestId = requestId;
  activeAssetKey = key;
  await unloadActiveSound();

  if (requestId !== playRequestId) return;

  await ensureAudioMode();

  try {
    const { sound: created } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: true, volume: 0.85, isLooping: false }
    );
    if (requestId !== playRequestId) {
      await created.unloadAsync();
      return;
    }
    sound = created;
    activeAssetKey = key;
  } catch {
    if (activeAssetKey === key) {
      activeAssetKey = null;
    }
    // Optional intro — ignore playback failures and continue.
  }
}

export async function stopStarCamMissionIntroAudio(): Promise<void> {
  playRequestId += 1;
  activeAssetKey = null;
  await unloadActiveSound();
}
