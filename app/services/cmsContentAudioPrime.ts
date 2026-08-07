/**
 * Pre-decode CMS content-page narration so short MP3s play immediately on Next.
 *
 * Disk preload alone is not enough on iOS — `Audio.Sound.createAsync` after a
 * page change races the AVAudioSession, and ~1s clips often finish (or fail)
 * before cold create + play settles. Priming creates the Sound ahead of time.
 *
 * IMPORTANT: Do not prime while intro BGM is active — iOS DoNotMix lets a second
 * Sound create steal/silence the intro music.
 */

import { Audio } from 'expo-av';

import { ensurePlayableCmsAudioUri } from '@/utils/cmsMediaFileExtension';
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

function keysForSound(sound: Audio.Sound): string[] {
  const keys: string[] = [];
  primedByUri.forEach((value, key) => {
    if (value === sound) keys.push(key);
  });
  return keys;
}

/**
 * True when it is safe to prime content narration (never during intro BGM).
 */
export function shouldPrimeCmsContentAudio(currentPageType: string | undefined): boolean {
  return currentPageType !== 'intro';
}

/**
 * Create (or keep) a loaded, paused Sound for this playable URI.
 * `aliasUris` let take() succeed whether the page uses remote or cached file://.
 */
export async function primeCmsContentAudio(
  uri: string | null | undefined,
  aliasUris: Array<string | null | undefined> = []
): Promise<boolean> {
  const rawKey = normalizeUri(uri);
  if (!rawKey) return false;
  const key = await ensurePlayableCmsAudioUri(rawKey);

  const aliases = Array.from(
    new Set([rawKey, ...aliasUris.map(normalizeUri)].filter((value) => Boolean(value) && value !== key))
  );

  const existing = primedByUri.get(key);
  if (existing && (await isSoundLoaded(existing))) {
    aliases.forEach((alias) => primedByUri.set(alias, existing));
    return true;
  }
  if (existing) {
    keysForSound(existing).forEach((k) => primedByUri.delete(k));
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
      aliases.forEach((alias) => primedByUri.set(alias, raced));
      return isSoundLoaded(raced);
    }

    primedByUri.set(key, sound);
    aliases.forEach((alias) => primedByUri.set(alias, sound));
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
  const rawKey = normalizeUri(uri);
  if (!rawKey) return null;
  const playableKey = await ensurePlayableCmsAudioUri(rawKey);

  const sound = primedByUri.get(playableKey) || primedByUri.get(rawKey);
  if (!sound) return null;

  keysForSound(sound).forEach((k) => primedByUri.delete(k));

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
  const unique = Array.from(new Set(primedByUri.values()));
  primedByUri.clear();
  await Promise.all(unique.map((sound) => unloadSound(sound)));
}

/** How many unique Sounds are currently primed (tests / diagnostics). */
export function getPrimedCmsContentAudioCount(): number {
  return new Set(primedByUri.values()).size;
}

export function resetCmsContentAudioPrimeForTests(): void {
  primedByUri.clear();
  primeGeneration = 0;
}
