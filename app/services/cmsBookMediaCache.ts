/**
 * CMS built-in book media downloads into durable documentDirectory packs.
 * Supports progressive mode: unlock play after page 0, keep downloading, iOS + Android.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Image as RNImage } from 'react-native';

import {
  isLocalMediaUri,
  type CmsMediaUriMap,
  type PreloadSummary,
} from '@/components/child/common/cms-player-media';
import { resolveCmsAbsoluteMediaUrl } from '@/components/child/common/cms-player-shared';
import type { CmsBookMediaAssetRef } from '@/services/cmsBookMediaManifest';
import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';
import {
  assetNeedsDownload,
  ensureBookPackDir,
  getBookPackAssetPath,
  loadBookPackForPreload,
  saveBookPack,
} from '@/services/cmsBookPackStorage';
import {
  collectRequiredCmsPageMediaUrls,
  isCmsPageMediaReady,
  prioritizeCmsBookAssetsForProgressivePreload,
} from '@/utils/cmsBookPageMediaReady';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

const inflight = new Map<string, Promise<string>>();

let fileSystemUsable: boolean | null = null;

function isHttp(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function isStreamOnlyVideoUrl(url: string): boolean {
  if (looksLikeBunnyExploreEmbedUrl(url)) return true;
  if (/mediadelivery\.net\/embed\//i.test(url)) return true;
  return false;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i;

function isImageUrl(url: string): boolean {
  return IMAGE_EXT.test(url);
}

function isVideoAsset(asset: CmsBookMediaAssetRef, remoteUrl: string): boolean {
  if (String(asset.kind || '').toLowerCase() === 'video') return true;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(remoteUrl) || /\/videos?\//i.test(remoteUrl);
}

async function canUseFileSystem(): Promise<boolean> {
  if (fileSystemUsable !== null) return fileSystemUsable;
  const root = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!root) {
    fileSystemUsable = false;
    return false;
  }
  try {
    const info = await FileSystem.getInfoAsync(root);
    fileSystemUsable = Boolean(info.exists);
  } catch {
    fileSystemUsable = false;
  }
  return fileSystemUsable;
}

async function fileExists(uri: string): Promise<boolean> {
  if (!(await canUseFileSystem())) return false;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return Boolean(info.exists);
  } catch {
    return false;
  }
}

async function ensureParentDirForPath(dest: string): Promise<boolean> {
  if (!(await canUseFileSystem())) return false;
  const slash = dest.lastIndexOf('/');
  if (slash <= 0) return false;
  const parentDir = `${dest.slice(0, slash + 1)}`;
  try {
    const info = await FileSystem.getInfoAsync(parentDir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
    }
    return true;
  } catch {
    fileSystemUsable = false;
    return false;
  }
}

async function downloadWithRetry(remoteUrl: string, dest: string, retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await FileSystem.downloadAsync(remoteUrl, dest);
      if (result.status === 200 && result.uri && (await fileExists(result.uri))) {
        return result.uri;
      }
    } catch {
      // retry
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
  return null;
}

async function downloadToPath(remoteUrl: string, dest: string): Promise<string | null> {
  const existing = inflight.get(`${dest}::${remoteUrl}`);
  if (existing) return existing;

  const task = (async () => {
    if (!(await ensureParentDirForPath(dest))) return null;

    try {
      if (await fileExists(dest)) return dest;
      return await downloadWithRetry(remoteUrl, dest);
    } catch {
      fileSystemUsable = false;
      return null;
    }
  })();

  inflight.set(`${dest}::${remoteUrl}`, task);
  try {
    return await task;
  } finally {
    inflight.delete(`${dest}::${remoteUrl}`);
  }
}

/** Decode warm must never block the download critical path (iOS + Android). */
function warmImageDecode(uri: string): void {
  if (!uri) return;
  void RNImage.prefetch(uri).catch(() => undefined);
}

async function preloadPackAsset(
  asset: CmsBookMediaAssetRef,
  bookId: string,
  uriMap: CmsMediaUriMap,
  needsDownload: boolean
): Promise<boolean> {
  const normalized = resolveCmsAbsoluteMediaUrl(asset.url);
  if (!normalized) return true;

  if (looksLikeBunnyExploreEmbedUrl(normalized) || isStreamOnlyVideoUrl(normalized)) {
    uriMap[normalized] = normalized;
    return true;
  }

  if (!isHttp(normalized)) {
    uriMap[normalized] = normalized;
    return true;
  }

  if (!needsDownload && uriMap[normalized] && isLocalMediaUri(uriMap[normalized])) {
    return true;
  }

  if (!(await canUseFileSystem())) {
    uriMap[normalized] = normalized;
    return false;
  }

  const dest = getBookPackAssetPath(bookId, asset.key, normalized, asset.kind);
  const localUri = needsDownload ? await downloadToPath(normalized, dest) : uriMap[normalized] || null;

  if (localUri && isLocalMediaUri(localUri)) {
    if (!(await fileExists(localUri))) {
      uriMap[normalized] = normalized;
      return false;
    }
    uriMap[normalized] = localUri;
    if (isImageUrl(normalized)) {
      warmImageDecode(localUri);
    }
    return true;
  }

  uriMap[normalized] = normalized;
  return false;
}

export interface PreloadCmsBookPackConcurrency {
  imageAudio?: number;
  video?: number;
}

export interface PreloadCmsBookPackOptions {
  bookId: string;
  contentVersion: string | null;
  assets: CmsBookMediaAssetRef[];
  /** Playable pages — enables progressive priority + early unlock. */
  pages?: CmsPlayablePage[];
  focusPageIndex?: number;
  /**
   * `progressive` — unlock via onPlayable after first page ready, continue in background.
   * `all` — wait for every asset (admin / tests).
   */
  mode?: 'progressive' | 'all';
  onProgress?: (percent: number) => void;
  /** Fires once when page 0 (start gate) media is ready — safe to dismiss full-screen loader. */
  onPlayable?: (uriMap: CmsMediaUriMap) => void;
  /** Fires after each asset so the Next gate can unlock mid-download. */
  onUriMapUpdate?: (uriMap: CmsMediaUriMap) => void;
  concurrency?: number | PreloadCmsBookPackConcurrency;
  /** Abort check — return true to stop workers early. */
  shouldCancel?: () => boolean;
}

export interface PreloadCmsBookPackResult extends PreloadSummary {
  restoredFromPack: boolean;
  usedDiskCache: boolean;
}

function resolveConcurrency(
  concurrency: number | PreloadCmsBookPackConcurrency | undefined
): { imageAudio: number; video: number } {
  if (typeof concurrency === 'number') {
    return { imageAudio: concurrency, video: Math.min(2, concurrency) };
  }
  return {
    imageAudio: concurrency?.imageAudio ?? 6,
    video: concurrency?.video ?? 1,
  };
}

function snapshotUriMap(uriMap: CmsMediaUriMap): CmsMediaUriMap {
  return { ...uriMap };
}

export async function preloadCmsBookPackAssets(
  options: PreloadCmsBookPackOptions
): Promise<PreloadCmsBookPackResult> {
  const {
    bookId,
    contentVersion,
    assets,
    pages = [],
    focusPageIndex = 0,
    mode = pages.length ? 'progressive' : 'all',
    onProgress,
    onPlayable,
    onUriMapUpdate,
    concurrency,
    shouldCancel,
  } = options;

  const limits = resolveConcurrency(concurrency);
  const failed: string[] = [];
  const uriMap: CmsMediaUriMap = {};
  const diskOk = await canUseFileSystem();
  let playableNotified = false;

  const notifyPlayableIfReady = () => {
    if (playableNotified || mode !== 'progressive') return;
    const startPage = pages[0];
    if (!startPage) {
      playableNotified = true;
      onPlayable?.(snapshotUriMap(uriMap));
      return;
    }
    if (isCmsPageMediaReady(startPage, uriMap)) {
      playableNotified = true;
      onPlayable?.(snapshotUriMap(uriMap));
    }
  };

  const packState = await loadBookPackForPreload(bookId, contentVersion);
  Object.assign(uriMap, packState.uriMap);

  if (packState.fullyRestored) {
    onProgress?.(100);
    onUriMapUpdate?.(snapshotUriMap(uriMap));
    onPlayable?.(snapshotUriMap(uriMap));
    return { failed, uriMap, restoredFromPack: true, usedDiskCache: diskOk };
  }

  const ordered =
    mode === 'progressive' && pages.length
      ? prioritizeCmsBookAssetsForProgressivePreload(assets, pages, focusPageIndex)
      : assets.filter((asset) => Boolean(asset?.url && asset?.key));

  const queue = ordered.filter((asset) => Boolean(asset?.url && asset?.key));
  if (!queue.length) {
    onProgress?.(100);
    onPlayable?.(snapshotUriMap(uriMap));
    return { failed, uriMap, restoredFromPack: false, usedDiskCache: diskOk };
  }

  if (!diskOk) {
    queue.forEach((asset) => {
      const remote = resolveCmsAbsoluteMediaUrl(asset.url);
      if (remote) {
        uriMap[remote] = remote;
        failed.push(remote);
      }
    });
    onProgress?.(100);
    onUriMapUpdate?.(snapshotUriMap(uriMap));
    onPlayable?.(snapshotUriMap(uriMap));
    return { failed, uriMap, restoredFromPack: false, usedDiskCache: false };
  }

  await ensureBookPackDir(bookId);

  // If pack already has page-0 media, unlock immediately before network work.
  notifyPlayableIfReady();
  onUriMapUpdate?.(snapshotUriMap(uriMap));

  let completed = 0;
  const total = queue.length;
  const report = () => {
    onProgress?.(Math.round((completed / total) * 100));
  };

  const imageAudioQueue: CmsBookMediaAssetRef[] = [];
  const videoQueue: CmsBookMediaAssetRef[] = [];
  queue.forEach((asset) => {
    const remote = resolveCmsAbsoluteMediaUrl(asset.url) || asset.url;
    if (isVideoAsset(asset, remote)) videoQueue.push(asset);
    else imageAudioQueue.push(asset);
  });

  const runQueue = async (workQueue: CmsBookMediaAssetRef[], workerCount: number) => {
    if (!workQueue.length) return;
    const workers = Array.from(
      { length: Math.min(Math.max(1, workerCount), workQueue.length) },
      async () => {
        while (workQueue.length) {
          if (shouldCancel?.()) return;
          const asset = workQueue.shift();
          if (!asset) break;
          const remote = resolveCmsAbsoluteMediaUrl(asset.url);
          const needsDownload = assetNeedsDownload(asset, packState.manifest, uriMap);
          const ok = await preloadPackAsset(asset, bookId, uriMap, needsDownload);
          if (!ok && remote && isHttp(remote)) failed.push(remote);
          completed += 1;
          report();
          onUriMapUpdate?.(snapshotUriMap(uriMap));
          notifyPlayableIfReady();
        }
      }
    );
    await Promise.all(workers);
  };

  // Prefer images/audio first so page 1 unlocks before heavy videos saturate the pipe.
  await runQueue(imageAudioQueue, limits.imageAudio);
  if (!shouldCancel?.()) {
    await runQueue(videoQueue, limits.video);
  }

  if (!playableNotified) {
    // Start page had no assets or only failed ones — still allow play.
    playableNotified = true;
    onPlayable?.(snapshotUriMap(uriMap));
  }

  onProgress?.(100);

  if (!shouldCancel?.()) {
    await saveBookPack({
      bookId,
      contentVersion,
      assets,
      uriMap,
    });
  }

  return { failed, uriMap, restoredFromPack: false, usedDiskCache: true };
}

/** @internal Resets cached FileSystem probe between tests. */
export function __resetCmsBookMediaCacheForTests(): void {
  fileSystemUsable = null;
  inflight.clear();
}

export { collectRequiredCmsPageMediaUrls, isCmsPageMediaReady };
