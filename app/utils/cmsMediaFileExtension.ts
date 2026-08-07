/**
 * CMS media file-extension helpers.
 *
 * Some CMS uploads are real MP3/AAC bytes but served as `.mpeg` / `.mpg`.
 * Android sniffs content and plays; iOS AVFoundation trusts the extension and
 * fails with AVFoundationErrorDomain -11828 ("This media format is not supported").
 */

import * as FileSystem from 'expo-file-system/legacy';

const AUDIO_SAFE_EXT = new Set(['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.caf']);
/** Extensions iOS treats as video MPEG even when the bytes are MP3 narration. */
const AUDIO_MPEG_MISLABEL_EXT = new Set(['.mpeg', '.mpg']);

function pathExt(url: string): string {
  const path = String(url || '').split('?')[0] ?? '';
  const match = path.match(/\.([a-z0-9]{1,8})$/i);
  return match ? `.${match[1].toLowerCase()}` : '';
}

export function looksLikeCmsAudioUrl(remoteUrl: string, kind?: string | null): boolean {
  if (kind === 'audio') return true;
  if (kind === 'video' || kind === 'image') return false;
  const url = String(remoteUrl || '');
  if (/\/audio\//i.test(url)) return true;
  if (/\.(mp3|m4a|wav|aac|ogg)(\?|$)/i.test(url)) return true;
  // Mislabelled CMS narration: only treat .mpeg/.mpg as audio when under /audio/
  if (/\.mpe?g(\?|$)/i.test(url) && /\/audio\//i.test(url)) return true;
  return false;
}

/**
 * Extension to use when caching/downloading CMS media for playback.
 * Audio `.mpeg` / `.mpg` → `.mp3` so iOS AVPlayer accepts the file.
 */
export function resolveCmsCacheFileExtension(
  remoteUrl: string,
  kind?: string | null
): string {
  const rawExt = pathExt(remoteUrl);
  const url = String(remoteUrl || '');

  if (kind === 'video') {
    return rawExt || '.mp4';
  }
  if (kind === 'image') {
    return rawExt || '.jpg';
  }

  if (looksLikeCmsAudioUrl(url, kind)) {
    if (!rawExt || AUDIO_MPEG_MISLABEL_EXT.has(rawExt) || rawExt === '.bin') {
      return '.mp3';
    }
    if (AUDIO_SAFE_EXT.has(rawExt)) {
      return rawExt;
    }
    // Audio asset labeled with a video container from a bad CMS upload.
    if (kind === 'audio' && ['.mp4', '.m4v', '.mov', ...AUDIO_MPEG_MISLABEL_EXT].includes(rawExt)) {
      return '.mp3';
    }
    return rawExt;
  }

  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || /\/videos?\//i.test(url)) {
    return rawExt || '.mp4';
  }
  if (/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(url) || /\/images?\//i.test(url)) {
    return rawExt || '.jpg';
  }

  return rawExt || '.bin';
}

/** True when a local/remote audio URI uses an iOS-hostile MPEG video extension. */
export function isIosHostileAudioExtension(uri: string | null | undefined): boolean {
  const ext = pathExt(String(uri || ''));
  return AUDIO_MPEG_MISLABEL_EXT.has(ext);
}

/**
 * Ensure a local audio file URI uses an extension iOS will play.
 * Copies `.mpeg`/`.mpg` file:// assets to a sibling `.mp3` (same bytes).
 * Remote URLs are returned unchanged — callers should cache with the fixed extension.
 */
export async function ensurePlayableCmsAudioUri(
  uri: string | null | undefined
): Promise<string> {
  const src = typeof uri === 'string' ? uri.trim() : '';
  if (!src) return '';
  if (!isIosHostileAudioExtension(src)) return src;

  // Remote .mpeg: cannot rename in place; playback must use a cached .mp3 path.
  if (!/^file:\/\//i.test(src)) {
    return src;
  }

  const dest = src.replace(/\.mpe?g(?=$|\?)/i, '.mp3');
  if (dest === src) return src;

  try {
    const destInfo = await FileSystem.getInfoAsync(dest);
    if (destInfo.exists) {
      return dest;
    }
    const srcInfo = await FileSystem.getInfoAsync(src);
    if (!srcInfo.exists) {
      return src;
    }
    await FileSystem.copyAsync({ from: src, to: dest });
    return dest;
  } catch {
    return src;
  }
}
