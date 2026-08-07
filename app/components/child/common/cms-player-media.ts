/**
 * Preload + disk cache for CMS built-in player media (images, audio, video).
 * All remote assets download into FileSystem.cacheDirectory; images are decode-warmed for RN Image.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Image as RNImage } from 'react-native';

import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

import {
  resolveAudioUrl,
  resolveCmsAbsoluteMediaUrl,
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

import { resolveCmsCacheFileExtension } from '@/utils/cmsMediaFileExtension';

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i;

/** Guess a file extension when CDN URLs omit one (expo-av needs a real video extension). */
function inferCachedExtension(url: string): string {
  return resolveCmsCacheFileExtension(url);
}

function isLikelyVideoUrl(url: string): boolean {
  if (!url) return false;
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return true;
  if (/(?:\/video|\/videos|videoasset|mediadelivery|\/embed\/)/i.test(url)) return true;
  return false;
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
  const normalized = resolveCmsAbsoluteMediaUrl(remoteUrl);
  if (!normalized || !isHttp(normalized)) return normalized || null;

  const memo = resolvedUriCache.get(normalized);
  if (memo) {
    const exists = await FileSystem.getInfoAsync(memo);
    if (exists.exists) return memo;
    resolvedUriCache.delete(normalized);
  }

  const dir = await ensureCacheDir();
  if (!dir) return null;

  const ext = inferCachedExtension(normalized);
  const dest = `${dir}${simpleHash(normalized)}${ext}`;
  const info = await FileSystem.getInfoAsync(dest);
  if (info.exists) {
    resolvedUriCache.set(normalized, dest);
    return dest;
  }

  // Migrate legacy audio caches saved as .mpeg/.mpg (iOS-unplayable).
  if (ext === '.mp3') {
    for (const legacyExt of ['.mpeg', '.mpg']) {
      const legacy = `${dir}${simpleHash(normalized)}${legacyExt}`;
      const legacyInfo = await FileSystem.getInfoAsync(legacy);
      if (legacyInfo.exists) {
        try {
          await FileSystem.copyAsync({ from: legacy, to: dest });
          resolvedUriCache.set(normalized, dest);
          return dest;
        } catch {
          resolvedUriCache.set(normalized, legacy);
          return legacy;
        }
      }
    }
  }
  return null;
}

export async function resolveCachedMediaUri(remoteUrl: string): Promise<string> {
  const normalized = resolveCmsAbsoluteMediaUrl(remoteUrl);
  if (!normalized || !isHttp(normalized)) return normalized;

  const ready = await getCachedMediaUriIfReady(normalized);
  if (ready && ready !== normalized) return ready;

  const memo = resolvedUriCache.get(normalized);
  if (memo) {
    const exists = await FileSystem.getInfoAsync(memo);
    if (exists.exists) return memo;
    resolvedUriCache.delete(normalized);
  }

  const existing = inflight.get(normalized);
  if (existing) return existing;

  const task = (async () => {
    const dir = await ensureCacheDir();
    if (!dir) return normalized;

    const ext = inferCachedExtension(normalized);
    const dest = `${dir}${simpleHash(normalized)}${ext}`;
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) {
      resolvedUriCache.set(normalized, dest);
      return dest;
    }

    try {
      const result = await FileSystem.downloadAsync(normalized, dest);
      if (result.status === 200 && result.uri) {
        resolvedUriCache.set(normalized, result.uri);
        return result.uri;
      }
    } catch {
      // fall through
    }
    return normalized;
  })();

  inflight.set(normalized, task);
  try {
    return await task;
  } finally {
    inflight.delete(normalized);
  }
}

function pushUrl(set: Set<string>, url: string | null | undefined) {
  const absolute = resolveCmsAbsoluteMediaUrl(url);
  if (absolute) set.add(absolute);
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
    const pageType = resolvePageType(page.type);

    pushUrl(set, resolveImageUrl(page));
    pushUrl(set, resolveVideoUrl(page));

    if (pageType === 'intro') {
      pushUrl(set, resolveIntroBackgroundMusicUrl(page));
    } else if (pageType === 'demo' || pageType === 'reward') {
      pushUrl(set, resolveVideoUrl(page));
      pushUrl(set, resolveImageUrl(page));
      pushMediaObjectUrl(set, media?.videoMedia);
      pushMediaObjectUrl(set, media?.backgroundImageMedia);
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
  const url = resolveCmsAbsoluteMediaUrl(remoteUrl);
  if (!url) return '';
  if (!isHttp(url)) return url;

  const fromMap = uriMap?.[url];
  if (fromMap) {
    return fromMap;
  }

  const memo = resolvedUriCache.get(url);
  if (memo) return memo;

  return url;
}

/** Star Cam-style lookup: prefer cached local URI, else remote. */
export function pickCmsPlayableMediaUri(
  remoteUrl: string | null | undefined,
  uriMap?: CmsMediaUriMap | null
): string {
  return resolvePlayableMediaUri(remoteUrl, uriMap);
}

function isImageUrl(url: string): boolean {
  return IMAGE_EXT.test(url);
}

async function warmImageDecode(uri: string): Promise<void> {
  if (!uri) return;
  try {
    // Fire-and-forget from callers; kept async for compatibility.
    await RNImage.prefetch(uri);
  } catch {
    // Decode warm is best-effort; file on disk is still usable.
  }
}

function isStreamOnlyVideoUrl(url: string): boolean {
  if (looksLikeBunnyExploreEmbedUrl(url)) return true;
  if (/mediadelivery\.net\/embed\//i.test(url)) return true;
  return false;
}

async function preloadOneAsset(
  remoteUrl: string,
  uriMap: CmsMediaUriMap
): Promise<boolean> {
  const normalized = resolveCmsAbsoluteMediaUrl(remoteUrl);
  if (!normalized) return true;
  if (looksLikeBunnyExploreEmbedUrl(normalized)) {
    uriMap[normalized] = normalized;
    return true;
  }
  if (isStreamOnlyVideoUrl(normalized)) {
    uriMap[normalized] = normalized;
    return true;
  }
  if (!isHttp(normalized)) {
    uriMap[normalized] = normalized;
    return true;
  }

  try {
    const localUri = await resolveCachedMediaUri(normalized);
    uriMap[normalized] = localUri;

    if (isImageUrl(normalized)) {
      // Do not await — decode warm must not block preload (iOS + Android).
      void warmImageDecode(isLocalMediaUri(localUri) ? localUri : normalized);
    }

    return isLocalMediaUri(localUri);
  } catch {
    uriMap[normalized] = normalized;
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
  concurrency = 6
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

export interface PreloadCmsPlayerAssetsOptions {
  onProgress?: (percent: number) => void;
  concurrency?: number;
  /** Prefer these URLs first (start gate / next page). */
  priorityUrls?: string[];
  onUriMapUpdate?: (uriMap: CmsMediaUriMap) => void;
  /** Called once when every priority URL is local or stream-only (or priority list empty). */
  onPlayable?: (uriMap: CmsMediaUriMap) => void;
  shouldCancel?: () => boolean;
}

export async function preloadCmsPlayerAssets(
  urls: string[],
  onProgressOrOptions?: ((percent: number) => void) | PreloadCmsPlayerAssetsOptions,
  concurrencyArg = 6
): Promise<PreloadSummary> {
  const options: PreloadCmsPlayerAssetsOptions =
    typeof onProgressOrOptions === 'function'
      ? { onProgress: onProgressOrOptions, concurrency: concurrencyArg }
      : onProgressOrOptions || {};

  const {
    onProgress,
    concurrency = 6,
    priorityUrls = [],
    onUriMapUpdate,
    onPlayable,
    shouldCancel,
  } = options;

  const unique = Array.from(new Set(urls.filter(Boolean)));
  const prioritySet = new Set(
    priorityUrls.map((u) => resolveCmsAbsoluteMediaUrl(u) || u).filter(Boolean)
  );
  const ordered = [
    ...unique.filter((u) => prioritySet.has(resolveCmsAbsoluteMediaUrl(u) || u)),
    ...unique.filter((u) => !prioritySet.has(resolveCmsAbsoluteMediaUrl(u) || u)),
  ];

  const failed: string[] = [];
  const uriMap: CmsMediaUriMap = {};
  if (!ordered.length) {
    onProgress?.(100);
    onPlayable?.(uriMap);
    return { failed, uriMap };
  }

  let completed = 0;
  let playableNotified = false;
  const report = () => {
    onProgress?.(Math.round((completed / ordered.length) * 100));
  };

  const maybePlayable = () => {
    if (playableNotified) return;
    const priorities = Array.from(prioritySet);
    const ready =
      !priorities.length ||
      priorities.every((url) => {
        if (isStreamOnlyVideoUrl(url)) return true;
        const mapped = uriMap[url];
        return Boolean(mapped && (isLocalMediaUri(mapped) || !isHttp(mapped)));
      });
    if (ready) {
      playableNotified = true;
      onPlayable?.({ ...uriMap });
    }
  };

  const queue = [...ordered];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      if (shouldCancel?.()) return;
      const next = queue.shift();
      if (!next) break;
      const ok = await preloadOneAsset(next, uriMap);
      if (!ok && isHttp(next)) failed.push(next);
      completed += 1;
      report();
      onUriMapUpdate?.({ ...uriMap });
      maybePlayable();
    }
  });

  await Promise.all(workers);
  if (!playableNotified) onPlayable?.({ ...uriMap });
  onProgress?.(100);
  return { failed, uriMap };
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
