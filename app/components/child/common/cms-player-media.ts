/**
 * Preload + disk cache for CMS built-in player media (images, audio, video).
 * All remote assets download into FileSystem.cacheDirectory; images are decode-warmed for RN Image.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Image as RNImage } from 'react-native';

import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';

import {
  resolveAudioUrl,
  resolveImageUrl,
  resolveIntroBackgroundMusicUrl,
  resolvePageType,
  resolveVideoUrl,
} from './cms-player-shared';

const CACHE_SUBDIR = 'cms-player-media';
const inflight = new Map<string, Promise<string>>();
const resolvedUriCache = new Map<string, string>();

function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function extensionFromUrl(url: string): string {
  const path = url.split('?')[0]?.toLowerCase() ?? '';
  const m = path.match(/\.([a-z0-9]{1,8})$/);
  if (!m) return '';
  return `.${m[1]}`;
}

function isHttp(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

async function ensureCacheDir(): Promise<string> {
  const root = FileSystem.cacheDirectory;
  if (!root) return '';
  const dir = `${root}${CACHE_SUBDIR}/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/**
 * Returns a local file URI for remote media when cached; otherwise downloads then caches.
 * Safe to call repeatedly (deduped in-flight + memory map).
 */
/** Returns a known local URI from memory/disk when already cached; otherwise null. */
export async function getCachedMediaUriIfReady(remoteUrl: string): Promise<string | null> {
  if (!remoteUrl || !isHttp(remoteUrl)) return remoteUrl;

  const memo = resolvedUriCache.get(remoteUrl);
  if (memo) {
    const exists = await FileSystem.getInfoAsync(memo);
    if (exists.exists) return memo;
    resolvedUriCache.delete(remoteUrl);
  }

  const dir = await ensureCacheDir();
  if (!dir) return null;

  const ext = extensionFromUrl(remoteUrl) || '.bin';
  const dest = `${dir}${simpleHash(remoteUrl)}${ext}`;
  const info = await FileSystem.getInfoAsync(dest);
  if (info.exists) {
    resolvedUriCache.set(remoteUrl, dest);
    return dest;
  }
  return null;
}

export async function resolveCachedMediaUri(remoteUrl: string): Promise<string> {
  if (!remoteUrl || !isHttp(remoteUrl)) return remoteUrl;

  const ready = await getCachedMediaUriIfReady(remoteUrl);
  if (ready && ready !== remoteUrl) return ready;

  const memo = resolvedUriCache.get(remoteUrl);
  if (memo) {
    const exists = await FileSystem.getInfoAsync(memo);
    if (exists.exists) return memo;
    resolvedUriCache.delete(remoteUrl);
  }

  const existing = inflight.get(remoteUrl);
  if (existing) return existing;

  const task = (async () => {
    const dir = await ensureCacheDir();
    if (!dir) return remoteUrl;

    const ext = extensionFromUrl(remoteUrl) || '.bin';
    const dest = `${dir}${simpleHash(remoteUrl)}${ext}`;
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) {
      resolvedUriCache.set(remoteUrl, dest);
      return dest;
    }

    try {
      const result = await FileSystem.downloadAsync(remoteUrl, dest);
      if (result.status === 200 && result.uri) {
        resolvedUriCache.set(remoteUrl, result.uri);
        return result.uri;
      }
    } catch {
      // fall through
    }
    return remoteUrl;
  })();

  inflight.set(remoteUrl, task);
  try {
    return await task;
  } finally {
    inflight.delete(remoteUrl);
  }
}

function pushUrl(set: Set<string>, url: string | null | undefined) {
  if (url && typeof url === 'string' && url.trim()) set.add(url.trim());
}

function pushMediaObjectUrl(set: Set<string>, value: unknown) {
  if (typeof value === 'string') {
    pushUrl(set, value);
    return;
  }
  if (value && typeof value === 'object') {
    const media = value as { url?: unknown; cloudUrl?: unknown };
    pushUrl(set, typeof media.url === 'string' ? media.url : null);
    pushUrl(set, typeof media.cloudUrl === 'string' ? media.cloudUrl : null);
  }
}

/** Collect every remote URL referenced by playable pages (for preload). */
export function collectCmsPlayerMediaUrls(pages: CmsPlayablePage[]): string[] {
  const set = new Set<string>();
  pages.forEach((page) => {
    const flat = page as unknown as Record<string, unknown>;
    const media = page.media as Record<string, unknown> | undefined;

    pushUrl(set, resolveImageUrl(page));
    pushUrl(set, resolveVideoUrl(page));
    if (resolvePageType(page.type) === 'intro') {
      pushUrl(set, resolveIntroBackgroundMusicUrl(page));
    } else {
      pushUrl(set, resolveAudioUrl(page));
    }

    const guideMedias = media?.guideImageMedias as { url?: string }[] | undefined;
    (guideMedias ?? []).forEach((m) => pushUrl(set, m?.url ?? null));
    pushUrl(set, (media?.guideImageMedia as { url?: string } | undefined)?.url);

    const sceneMedias = media?.sceneImageMedias as { url?: string }[] | undefined;
    (sceneMedias ?? []).forEach((m) => pushUrl(set, m?.url ?? null));
    pushUrl(set, (media?.sceneImageMedia as { url?: string } | undefined)?.url);

    pushUrl(set, flat.optionImageOne as string | undefined);
    pushUrl(set, flat.optionImageTwo as string | undefined);
    pushUrl(set, flat.answerAudioOne as string | undefined);
    pushUrl(set, flat.answerAudioTwo as string | undefined);

    const opts = page.interaction?.options ?? [];
    opts.forEach((o) => {
      const opt = o as Record<string, unknown>;
      pushUrl(set, (opt.imageMedia as { url?: string } | undefined)?.url ?? null);
      pushUrl(set, (opt.audioMedia as { url?: string } | undefined)?.url ?? null);
      pushMediaObjectUrl(set, opt.image);
      pushMediaObjectUrl(set, opt.audio);
      pushUrl(set, opt.imageUrl as string | undefined);
      pushUrl(set, opt.audioUrl as string | undefined);
    });

    const dropZones = page.interaction?.dropZones ?? [];
    dropZones.forEach((zone) => {
      const z = zone as Record<string, unknown>;
      pushUrl(set, z.audioUrl as string | undefined);
      pushMediaObjectUrl(set, z.audioMedia);
      pushMediaObjectUrl(set, z.audio);
    });
  });
  return Array.from(set);
}

export type CmsMediaUriMap = Record<string, string>;

/** Resolve remote URL to cached local file when available. */
export function resolvePlayableMediaUri(
  remoteUrl: string | null | undefined,
  uriMap?: CmsMediaUriMap | null
): string {
  const url = typeof remoteUrl === 'string' ? remoteUrl.trim() : '';
  if (!url) return '';
  if (!isHttp(url)) return url;

  const fromMap = uriMap?.[url];
  if (fromMap && isLocalMediaUri(fromMap)) return fromMap;

  const memo = resolvedUriCache.get(url);
  if (memo) return memo;

  return url;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i;

function isImageUrl(url: string): boolean {
  return IMAGE_EXT.test(url);
}

async function warmImageDecode(uri: string): Promise<void> {
  if (!uri) return;
  try {
    await RNImage.prefetch(uri);
  } catch {
    // Decode warm is best-effort; file on disk is still usable.
  }
}

async function preloadOneAsset(
  remoteUrl: string,
  uriMap: CmsMediaUriMap
): Promise<boolean> {
  if (!remoteUrl) return true;
  if (!isHttp(remoteUrl)) {
    uriMap[remoteUrl] = remoteUrl;
    return true;
  }

  try {
    const localUri = await resolveCachedMediaUri(remoteUrl);
    uriMap[remoteUrl] = localUri;

    if (isImageUrl(remoteUrl)) {
      await warmImageDecode(isLocalMediaUri(localUri) ? localUri : remoteUrl);
    }

    return isLocalMediaUri(localUri);
  } catch {
    uriMap[remoteUrl] = remoteUrl;
    return false;
  }
}

export interface PreloadSummary {
  failed: string[];
  uriMap: CmsMediaUriMap;
}

/**
 * Preload all URLs; invokes onProgress with 0–100.
 * Uses bounded concurrency to avoid saturating the device.
 */
/** True when URI is already on device (not a remote http/https URL). */
export function isLocalMediaUri(uri: string | null | undefined): boolean {
  if (!uri || typeof uri !== 'string') return false;
  return !/^https?:\/\//i.test(uri.trim());
}

/**
 * Preload every asset to disk (images + video + audio).
 * Use for Star Cam missions so practice `<Image>` / `<Video>` can play from `file://` URIs.
 */
export async function preloadMediaAssetsToCache(
  urls: string[],
  onProgress?: (percent: number) => void,
  concurrency = 4
): Promise<PreloadSummary> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  const failed: string[] = [];
  const uriMap: CmsMediaUriMap = {};
  if (!unique.length) {
    onProgress?.(100);
    return { failed, uriMap };
  }

  let completed = 0;
  const report = () => {
    onProgress?.(Math.round((completed / unique.length) * 100));
  };

  const queue = [...unique];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) break;
      const ok = await preloadOneAsset(next, uriMap);
      if (!ok && isHttp(next)) failed.push(next);
      completed += 1;
      report();
    }
  });

  await Promise.all(workers);
  onProgress?.(100);
  return { failed, uriMap };
}

export async function preloadCmsPlayerAssets(
  urls: string[],
  onProgress?: (percent: number) => void,
  concurrency = 4
): Promise<PreloadSummary> {
  return preloadMediaAssetsToCache(urls, onProgress, concurrency);
}

export function clearCmsPlayerResolvedUriCache(): void {
  resolvedUriCache.clear();
}

/** Remote URL → playable local URI map after `preloadMediaAssetsToCache`. */
export async function snapshotCachedMediaUris(urls: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(urls.filter((u) => u && isHttp(u))));
  const map: Record<string, string> = {};
  await Promise.all(
    unique.map(async (remote) => {
      const local = await getCachedMediaUriIfReady(remote);
      map[remote] = local && isLocalMediaUri(local) ? local : await resolveCachedMediaUri(remote);
    })
  );
  return map;
}
