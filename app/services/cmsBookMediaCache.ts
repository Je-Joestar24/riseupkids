/**
 * CMS built-in book media downloads into durable documentDirectory packs.
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
import {
  assetNeedsDownload,
  ensureBookPackDir,
  getBookPackAssetPath,
  loadBookPackForPreload,
  saveBookPack,
} from '@/services/cmsBookPackStorage';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

const inflight = new Map<string, Promise<string>>();

let fileSystemUsable: boolean | null = null;

function isHttp(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function isLikelyVideoUrl(url: string): boolean {
  if (!url) return false;
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return true;
  if (/(?:\/video|\/videos|videoasset|mediadelivery|\/embed\/)/i.test(url)) return true;
  return false;
}

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i;

function isImageUrl(url: string): boolean {
  return IMAGE_EXT.test(url);
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

async function warmImageDecode(uri: string): Promise<void> {
  if (!uri) return;
  try {
    await RNImage.prefetch(uri);
  } catch {
    // best effort
  }
}

async function preloadPackAsset(
  asset: CmsBookMediaAssetRef,
  bookId: string,
  uriMap: CmsMediaUriMap,
  needsDownload: boolean
): Promise<boolean> {
  const normalized = resolveCmsAbsoluteMediaUrl(asset.url);
  if (!normalized) return true;

  if (looksLikeBunnyExploreEmbedUrl(normalized) || isLikelyVideoUrl(normalized)) {
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

  const dest = getBookPackAssetPath(bookId, asset.key, normalized);
  const localUri = needsDownload ? await downloadToPath(normalized, dest) : uriMap[normalized] || null;

  if (localUri && isLocalMediaUri(localUri)) {
    uriMap[normalized] = localUri;
    if (isImageUrl(normalized)) {
      await warmImageDecode(localUri);
    }
    return true;
  }

  uriMap[normalized] = normalized;
  return false;
}

export interface PreloadCmsBookPackOptions {
  bookId: string;
  contentVersion: string | null;
  assets: CmsBookMediaAssetRef[];
  onProgress?: (percent: number) => void;
  concurrency?: number;
}

export interface PreloadCmsBookPackResult extends PreloadSummary {
  restoredFromPack: boolean;
  usedDiskCache: boolean;
}

export async function preloadCmsBookPackAssets(
  options: PreloadCmsBookPackOptions
): Promise<PreloadCmsBookPackResult> {
  const { bookId, contentVersion, assets, onProgress, concurrency = 4 } = options;
  const failed: string[] = [];
  const uriMap: CmsMediaUriMap = {};
  const diskOk = await canUseFileSystem();

  const packState = await loadBookPackForPreload(bookId, contentVersion);
  Object.assign(uriMap, packState.uriMap);

  if (packState.fullyRestored) {
    onProgress?.(100);
    return { failed, uriMap, restoredFromPack: true, usedDiskCache: diskOk };
  }

  const queue = assets.filter((asset) => Boolean(asset?.url && asset?.key));
  if (!queue.length) {
    onProgress?.(100);
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
    return { failed, uriMap, restoredFromPack: false, usedDiskCache: false };
  }

  await ensureBookPackDir(bookId);

  let completed = 0;
  const report = () => {
    onProgress?.(Math.round((completed / queue.length) * 100));
  };

  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const asset = queue.shift();
      if (!asset) break;
      const remote = resolveCmsAbsoluteMediaUrl(asset.url);
      const needsDownload = assetNeedsDownload(asset, packState.manifest, uriMap);
      const ok = await preloadPackAsset(asset, bookId, uriMap, needsDownload);
      if (!ok && remote && isHttp(remote)) failed.push(remote);
      completed += 1;
      report();
    }
  });

  await Promise.all(workers);
  onProgress?.(100);

  await saveBookPack({
    bookId,
    contentVersion,
    assets,
    uriMap,
  });

  return { failed, uriMap, restoredFromPack: false, usedDiskCache: true };
}

/** @internal Resets cached FileSystem probe between tests. */
export function __resetCmsBookMediaCacheForTests(): void {
  fileSystemUsable = null;
  inflight.clear();
}
