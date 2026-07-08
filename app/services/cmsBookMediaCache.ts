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
  getBookPackAssetPath,
  loadBookPackForPreload,
  saveBookPack,
} from '@/services/cmsBookPackStorage';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

const inflight = new Map<string, Promise<string>>();

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
  const root = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!root) return false;
  try {
    await FileSystem.getInfoAsync(root);
    return true;
  } catch {
    return false;
  }
}

async function downloadToPath(remoteUrl: string, dest: string): Promise<string | null> {
  const existing = inflight.get(`${dest}::${remoteUrl}`);
  if (existing) return existing;

  const task = (async () => {
    try {
      const info = await FileSystem.getInfoAsync(dest);
      if (info.exists) return dest;
      const result = await FileSystem.downloadAsync(remoteUrl, dest);
      if (result.status === 200 && result.uri) return result.uri;
    } catch {
      // fall through
    }
    return null;
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
}

export async function preloadCmsBookPackAssets(
  options: PreloadCmsBookPackOptions
): Promise<PreloadCmsBookPackResult> {
  const { bookId, contentVersion, assets, onProgress, concurrency = 4 } = options;
  const failed: string[] = [];
  const uriMap: CmsMediaUriMap = {};

  const packState = await loadBookPackForPreload(bookId, contentVersion);
  Object.assign(uriMap, packState.uriMap);

  if (packState.fullyRestored) {
    onProgress?.(100);
    return { failed, uriMap, restoredFromPack: true };
  }

  const queue = assets.filter((asset) => Boolean(asset?.url && asset?.key));
  if (!queue.length) {
    onProgress?.(100);
    return { failed, uriMap, restoredFromPack: false };
  }

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

  return { failed, uriMap, restoredFromPack: false };
}
