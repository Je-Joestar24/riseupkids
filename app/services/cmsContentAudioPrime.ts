/**
 * Pre-decode CMS content-page narration so short MP3s play immediately on Next.
 *
 * Disk preload alone is not enough on iOS — `Audio.Sound.createAsync` after a
 * page change races the AVAudioSession, and ~1s clips often finish (or fail)
 * before cold create + play settles. Priming creates the Sound ahead of time.
 */

import { Audio } from 'expo-av';

import { ensureCmsPlaybackAudioMode } from '@/utils/cmsPlaybackAudio';

const primedByUri = new Map<string, Audio.Sound>();
/** Generation bump cancels in-flight primes on clear. */
let primeGeneration = 0;

function normalizeUri(uri: string | null | undefined): string {
  return typeof uri === 'string' ? uri.trim() : '';
}

async function unloadSound(sound: Audio.Sound | null | undefined): Promise<void> {
  if (!sound) return;
  try {
    sound.setOnPlaybackStatusUpdate(null);
  } catch {
    // ignore
  }
  try {
    await sound.unloadAsync();
  } catch {
    // ignore
  }
}

async function isSoundLoaded(sound: Audio.Sound): Promise<boolean> {
  try {
    const status = await sound.getStatusAsync();
    return status.isLoaded;
  } catch {
    return false;
  }
}

/**
 * Create (or keep) a loaded, paused Sound for this playable URI.
 * Safe to call repeatedly for the current + next content pages.
 */
export async function primeCmsContentAudio(uri: string | null | undefined): Promise<boolean> {
  const key = normalizeUri(uri);
  if (!key) return false;

  const existing = primedByUri.get(key);
  if (existing && (await isSoundLoaded(existing))) {
    return true;
  }
  if (existing) {
    primedByUri.delete(key);
    await unloadSound(existing);
  }

  const generation = primeGeneration;
  await ensureCmsPlaybackAudioMode();
  if (generation !== primeGeneration) return false;

  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: key },
      { shouldPlay: false, positionMillis: 0, volume: 1 }
    );

    if (generation !== primeGeneration) {
      await unloadSound(sound);
      return false;
    }

    const raced = primedByUri.get(key);
    if (raced) {
      await unloadSound(sound);
      return isSoundLoaded(raced);
    }

    primedByUri.set(key, sound);
    return true;
  } catch {
    return false;
  }
}

/**
 * Take ownership of a primed Sound (removed from the pool).
 * Returns null when nothing was primed or the Sound unloaded.
 */
export async function takePrimedCmsContentAudio(
  uri: string | null | undefined
): Promise<Audio.Sound | null> {
  const key = normalizeUri(uri);
  if (!key) return null;

  const sound = primedByUri.get(key);
  if (!sound) return null;
  primedByUri.delete(key);

  if (!(await isSoundLoaded(sound))) {
    await unloadSound(sound);
    return null;
  }

  try {
    await sound.setPositionAsync(0);
  } catch {
    // still playable from current position in worst case
  }
  return sound;
}

/** Drop every primed Sound — call when the CMS player closes. */
export async function clearPrimedCmsContentAudio(): Promise<void> {
  primeGeneration += 1;
  const sounds = Array.from(primedByUri.values());
  primedByUri.clear();
  await Promise.all(sounds.map((sound) => unloadSound(sound)));
}

/** How many URIs are currently primed (tests / diagnostics). */
export function getPrimedCmsContentAudioCount(): number {
  return primedByUri.size;
}

export function resetCmsContentAudioPrimeForTests(): void {
  primedByUri.clear();
  primeGeneration = 0;
}
