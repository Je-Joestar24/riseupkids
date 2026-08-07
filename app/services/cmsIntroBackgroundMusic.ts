/**
 * CMS intro/cover looping background music — iOS TestFlight–safe.
 *
 * Orientation lock can reset AVAudioSession after createAsync(shouldPlay).
 * This service: settle → set audio mode → load → explicit playAsync → watchdog retry
 * → manual loop on didJustFinish when native isLooping glitches on iOS.
 *
 * @see docs/CMS_INTRO_BACKGROUND_MUSIC_IOS_FIX.md
 */

import { Audio, type AVPlaybackStatus } from 'expo-av';

import {
  CMS_INTRO_BGM_PLAY_WATCHDOG_MS,
  ensureCmsPlaybackAudioMode,
  getCmsIntroBackgroundMusicSettleMs,
  resolveCmsIntroBackgroundMusicStatusAction,
} from '@/utils/cmsPlaybackAudio';
import { ensurePlayableCmsAudioUri } from '@/utils/cmsMediaFileExtension';

let activeSound: Audio.Sound | null = null;
let playRequestId = 0;
let activeUri: string | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function unloadActiveSound(): Promise<void> {
  const sound = activeSound;
  activeSound = null;
  activeUri = null;
  if (!sound) return;
  try {
    sound.setOnPlaybackStatusUpdate(null);
  } catch {
    // ignore
  }
  try {
    await sound.stopAsync();
  } catch {
    // already stopped
  }
  try {
    await sound.unloadAsync();
  } catch {
    // already unloaded
  }
}

async function applyStatusAction(
  sound: Audio.Sound,
  action: ReturnType<typeof resolveCmsIntroBackgroundMusicStatusAction>
): Promise<void> {
  if (action === 'noop') return;
  try {
    if (action === 'retry_session') {
      await ensureCmsPlaybackAudioMode();
      await sound.playAsync();
      return;
    }
    if (action === 'replay') {
      await sound.setPositionAsync(0);
      await sound.playAsync();
      return;
    }
    if (action === 'play') {
      await sound.playAsync();
    }
  } catch {
    // Best-effort — intro BGM is optional.
  }
}

function attachStatusHandler(sound: Audio.Sound, requestId: number): void {
  sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
    if (requestId !== playRequestId || sound !== activeSound) return;
    if (!status.isLoaded) return;
    const action = resolveCmsIntroBackgroundMusicStatusAction({
      isLoaded: true,
      isPlaying: status.isPlaying,
      didJustFinish: status.didJustFinish,
    });
    void applyStatusAction(sound, action);
  });
}

/**
 * Start looping intro BGM for `uri`. Cancels any previous intro BGM.
 * Safe to call repeatedly when uri / audio-session epoch changes.
 */
export async function startCmsIntroBackgroundMusic(uri: string): Promise<boolean> {
  const trimmed = String(uri || '').trim();
  if (!trimmed) {
    await stopCmsIntroBackgroundMusic();
    return false;
  }

  const requestId = playRequestId + 1;
  playRequestId = requestId;

  await unloadActiveSound();
  if (requestId !== playRequestId) return false;

  const settleMs = getCmsIntroBackgroundMusicSettleMs();
  if (settleMs > 0) {
    await delay(settleMs);
    if (requestId !== playRequestId) return false;
  }

  await ensureCmsPlaybackAudioMode();
  if (requestId !== playRequestId) return false;

  const playableUri = await ensurePlayableCmsAudioUri(trimmed);
  if (requestId !== playRequestId) return false;

  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: playableUri },
      {
        shouldPlay: false,
        isLooping: true,
        volume: 1,
        progressUpdateIntervalMillis: 500,
      }
    );

    if (requestId !== playRequestId) {
      try {
        await sound.unloadAsync();
      } catch {
        // ignore
      }
      return false;
    }

    activeSound = sound;
    activeUri = trimmed;
    attachStatusHandler(sound, requestId);

    await sound.playAsync();

    // Immediate re-arm: iOS often reports loaded-but-silent right after playAsync.
    try {
      const early = await sound.getStatusAsync();
      if (early.isLoaded && !early.isPlaying && !early.didJustFinish) {
        await ensureCmsPlaybackAudioMode();
        if (requestId !== playRequestId || sound !== activeSound) return false;
        await sound.playAsync();
      }
    } catch {
      // ignore — watchdog below still runs
    }

    // Watchdog: iOS often loads then goes silent after orientation/session reset.
    await delay(CMS_INTRO_BGM_PLAY_WATCHDOG_MS);
    if (requestId !== playRequestId || sound !== activeSound) return false;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        const action = resolveCmsIntroBackgroundMusicStatusAction({
          isLoaded: true,
          isPlaying: status.isPlaying,
          watchdogNotPlaying: !status.isPlaying,
        });
        await applyStatusAction(sound, action);
      }
    } catch {
      // ignore
    }

    return true;
  } catch {
    if (requestId === playRequestId) {
      activeSound = null;
      activeUri = null;
    }
    return false;
  }
}

export async function stopCmsIntroBackgroundMusic(): Promise<void> {
  playRequestId += 1;
  await unloadActiveSound();
}

/** Test / debug helpers */
export function getCmsIntroBackgroundMusicDebugState(): {
  hasSound: boolean;
  uri: string | null;
  requestId: number;
} {
  return {
    hasSound: Boolean(activeSound),
    uri: activeUri,
    requestId: playRequestId,
  };
}

export function resetCmsIntroBackgroundMusicForTests(): void {
  playRequestId += 1;
  activeSound = null;
  activeUri = null;
}
