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
import { resolveCmsBookMediaManifest } from '@/services/cmsBookMediaManifest';
import type { CmsPlayableBookDetail, CmsPlayablePage } from '@/services/cmsBooksPlayerService';
import {
  assetNeedsDownload,
  ensureBookPackDir,
  getBookPackAssetPath,
  loadBookPackForPreload,
  saveBookPack,
} from '@/services/cmsBookPackStorage';
import {
  collectRequiredCmsPageMediaUrls,
  isCmsBookAssetWithinLookahead,
  isCmsNearTermVideoAsset,
  isCmsPageMediaReady,
  prioritizeCmsBookAssetsForProgressivePreload,
} from '@/utils/cmsBookPageMediaReady';
import {
  ensurePlayableCmsAudioUri,
  looksLikeCmsAudioUrl,
} from '@/utils/cmsMediaFileExtension';
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
      // New path may be .mp3 while an older .mpeg pack file still exists.
      if (looksLikeCmsAudioUrl(normalized, asset.kind)) {
        for (const legacyExt of ['.mpeg', '.mpg']) {
          const legacy = dest.replace(/\.mp3$/i, legacyExt);
          if (legacy !== dest && (await fileExists(legacy))) {
            const migrated = await ensurePlayableCmsAudioUri(legacy);
            if (migrated && (await fileExists(migrated))) {
              uriMap[normalized] = migrated;
              return true;
            }
          }
        }
      }
      uriMap[normalized] = normalized;
      return false;
    }
    const playable = looksLikeCmsAudioUrl(normalized, asset.kind)
      ? await ensurePlayableCmsAudioUri(localUri)
      : localUri;
    uriMap[normalized] = playable;
    if (isImageUrl(normalized)) {
      warmImageDecode(playable);
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
   * When set, only enqueue assets for pages `focus … focus+N` (library idle warm-up).
   * Omit for a full-book download.
   */
  maxPageLookahead?: number;
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

type PackPreloadListener = Pick<
  PreloadCmsBookPackOptions,
  'onProgress' | 'onPlayable' | 'onUriMapUpdate' | 'shouldCancel'
>;

interface PackPreloadSession {
  key: string;
  promise: Promise<PreloadCmsBookPackResult>;
  uriMap: CmsMediaUriMap;
  playable: boolean;
  progress: number;
  listeners: Set<PackPreloadListener>;
}

const packSessions = new Map<string, PackPreloadSession>();

function packSessionKey(
  bookId: string,
  contentVersion: string | null,
  maxPageLookahead?: number
): string {
  const lookahead = typeof maxPageLookahead === 'number' ? String(maxPageLookahead) : 'full';
  return `${bookId}::${contentVersion || ''}::${lookahead}`;
}

function sessionShouldCancel(session: PackPreloadSession): boolean {
  if (!session.listeners.size) return true;
  const keepAlive = [...session.listeners].some((listener) => !listener.shouldCancel);
  if (keepAlive) return false;
  return [...session.listeners].every((listener) => Boolean(listener.shouldCancel?.()));
}

function fanoutProgress(session: PackPreloadSession, percent: number) {
  session.progress = percent;
  session.listeners.forEach((listener) => {
    if (listener.shouldCancel?.()) return;
    listener.onProgress?.(percent);
  });
}

function fanoutUriMap(session: PackPreloadSession, uriMap: CmsMediaUriMap) {
  session.uriMap = uriMap;
  session.listeners.forEach((listener) => {
    if (listener.shouldCancel?.()) return;
    listener.onUriMapUpdate?.(uriMap);
  });
}

function fanoutPlayable(session: PackPreloadSession, uriMap: CmsMediaUriMap) {
  session.playable = true;
  session.uriMap = uriMap;
  session.listeners.forEach((listener) => {
    if (listener.shouldCancel?.()) return;
    listener.onPlayable?.(uriMap);
  });
}

function orderPackAssets(
  assets: CmsBookMediaAssetRef[],
  pages: CmsPlayablePage[],
  focusPageIndex: number,
  maxPageLookahead: number | undefined,
  mode: 'progressive' | 'all'
): CmsBookMediaAssetRef[] {
  const usable = assets.filter((asset) => Boolean(asset?.url && asset?.key));
  if (mode === 'progressive' && pages.length) {
    return prioritizeCmsBookAssetsForProgressivePreload(
      usable,
      pages,
      focusPageIndex,
      maxPageLookahead
    );
  }
  if (typeof maxPageLookahead === 'number' && pages.length) {
    return usable.filter((asset) =>
      isCmsBookAssetWithinLookahead(asset.key, pages, focusPageIndex, maxPageLookahead)
    );
  }
  return usable;
}

function packCoversQueue(
  queue: CmsBookMediaAssetRef[],
  packState: Awaited<ReturnType<typeof loadBookPackForPreload>>,
  uriMap: CmsMediaUriMap
): boolean {
  if (!packState.fullyRestored) return false;
  return queue.every((asset) => {
    const remote = resolveCmsAbsoluteMediaUrl(asset.url);
    if (!remote) return true;
    if (isStreamOnlyVideoUrl(remote) || looksLikeBunnyExploreEmbedUrl(remote)) return true;
    const mapped = uriMap[remote];
    return (
      Boolean(mapped && isLocalMediaUri(mapped)) &&
      !assetNeedsDownload(asset, packState.manifest, uriMap)
    );
  });
}

async function runCmsBookPackPreload(
  options: PreloadCmsBookPackOptions,
  session: PackPreloadSession | null
): Promise<PreloadCmsBookPackResult> {
  const {
    bookId,
    contentVersion,
    assets,
    pages = [],
    focusPageIndex = 0,
    maxPageLookahead,
    mode = pages.length ? 'progressive' : 'all',
    concurrency,
  } = options;

  const limits = resolveConcurrency(concurrency);
  const failed: string[] = [];
  const uriMap: CmsMediaUriMap = {};
  const diskOk = await canUseFileSystem();
  let playableNotified = false;
  const isLookaheadOnly = typeof maxPageLookahead === 'number';

  const emitProgress = (percent: number) => {
    if (session) fanoutProgress(session, percent);
    else options.onProgress?.(percent);
  };
  const emitUriMap = (map: CmsMediaUriMap) => {
    if (session) fanoutUriMap(session, map);
    else options.onUriMapUpdate?.(map);
  };
  const emitPlayable = (map: CmsMediaUriMap) => {
    if (session) fanoutPlayable(session, map);
    else options.onPlayable?.(map);
  };
  const cancelled = () =>
    session ? sessionShouldCancel(session) : Boolean(options.shouldCancel?.());

  const notifyPlayableIfReady = () => {
    if (playableNotified || mode !== 'progressive') return;
    const startPage = pages[0];
    if (!startPage) {
      playableNotified = true;
      emitPlayable(snapshotUriMap(uriMap));
      return;
    }
    if (isCmsPageMediaReady(startPage, uriMap)) {
      playableNotified = true;
      emitPlayable(snapshotUriMap(uriMap));
    }
  };

  const packState = await loadBookPackForPreload(bookId, contentVersion);
  Object.assign(uriMap, packState.uriMap);

  const queue = orderPackAssets(assets, pages, focusPageIndex, maxPageLookahead, mode);

  if (packCoversQueue(queue, packState, uriMap)) {
    emitProgress(100);
    emitUriMap(snapshotUriMap(uriMap));
    emitPlayable(snapshotUriMap(uriMap));
    return { failed, uriMap, restoredFromPack: true, usedDiskCache: diskOk };
  }

  if (!queue.length) {
    emitProgress(100);
    emitPlayable(snapshotUriMap(uriMap));
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
    emitProgress(100);
    emitUriMap(snapshotUriMap(uriMap));
    emitPlayable(snapshotUriMap(uriMap));
    return { failed, uriMap, restoredFromPack: false, usedDiskCache: false };
  }

  await ensureBookPackDir(bookId);

  notifyPlayableIfReady();
  emitUriMap(snapshotUriMap(uriMap));

  let completed = 0;
  const total = queue.length;
  const report = () => {
    emitProgress(Math.round((completed / total) * 100));
  };

  const imageAudioQueue: CmsBookMediaAssetRef[] = [];
  const nearVideoQueue: CmsBookMediaAssetRef[] = [];
  const farVideoQueue: CmsBookMediaAssetRef[] = [];
  queue.forEach((asset) => {
    const remote = resolveCmsAbsoluteMediaUrl(asset.url) || asset.url;
    if (!isVideoAsset(asset, remote)) {
      imageAudioQueue.push(asset);
      return;
    }
    if (pages.length && isCmsNearTermVideoAsset(asset, pages, focusPageIndex, 2)) {
      nearVideoQueue.push(asset);
      return;
    }
    farVideoQueue.push(asset);
  });

  const runQueue = async (workQueue: CmsBookMediaAssetRef[], workerCount: number) => {
    if (!workQueue.length) return;
    const workers = Array.from(
      { length: Math.min(Math.max(1, workerCount), workQueue.length) },
      async () => {
        while (workQueue.length) {
          if (cancelled()) return;
          const asset = workQueue.shift();
          if (!asset) break;
          const remote = resolveCmsAbsoluteMediaUrl(asset.url);
          const needsDownload = assetNeedsDownload(asset, packState.manifest, uriMap);
          const ok = await preloadPackAsset(asset, bookId, uriMap, needsDownload);
          if (!ok && remote && isHttp(remote)) failed.push(remote);
          completed += 1;
          report();
          emitUriMap(snapshotUriMap(uriMap));
          notifyPlayableIfReady();
        }
      }
    );
    await Promise.all(workers);
  };

  await Promise.all([
    runQueue(imageAudioQueue, limits.imageAudio),
    runQueue(nearVideoQueue, limits.video),
  ]);
  if (!cancelled()) {
    await runQueue(farVideoQueue, limits.video);
  }

  if (!playableNotified) {
    playableNotified = true;
    emitPlayable(snapshotUriMap(uriMap));
  }

  emitProgress(100);

  if (!cancelled() && !isLookaheadOnly) {
    await saveBookPack({
      bookId,
      contentVersion,
      assets,
      uriMap,
    });
  }

  return { failed, uriMap, restoredFromPack: false, usedDiskCache: true };
}

export async function preloadCmsBookPackAssets(
  options: PreloadCmsBookPackOptions
): Promise<PreloadCmsBookPackResult> {
  const key = packSessionKey(options.bookId, options.contentVersion, options.maxPageLookahead);
  const listener: PackPreloadListener = {
    onProgress: options.onProgress,
    onPlayable: options.onPlayable,
    onUriMapUpdate: options.onUriMapUpdate,
    shouldCancel: options.shouldCancel,
  };

  const existing = packSessions.get(key);
  if (existing) {
    existing.listeners.add(listener);
    if (existing.progress) listener.onProgress?.(existing.progress);
    if (Object.keys(existing.uriMap).length) {
      listener.onUriMapUpdate?.(snapshotUriMap(existing.uriMap));
    }
    if (existing.playable) listener.onPlayable?.(snapshotUriMap(existing.uriMap));
    try {
      return await existing.promise;
    } finally {
      existing.listeners.delete(listener);
    }
  }

  const session: PackPreloadSession = {
    key,
    promise: Promise.resolve({
      failed: [],
      uriMap: {},
      restoredFromPack: false,
      usedDiskCache: false,
    }),
    uriMap: {},
    playable: false,
    progress: 0,
    listeners: new Set([listener]),
  };

  session.promise = runCmsBookPackPreload(options, session).finally(() => {
    if (packSessions.get(key) === session) packSessions.delete(key);
  });
  packSessions.set(key, session);

  try {
    return await session.promise;
  } finally {
    session.listeners.delete(listener);
  }
}

/**
 * Start a progressive pack download as soon as playable book JSON is in hand.
 * The player modal joins this session instead of waiting for its own effect.
 */
export function startCmsBookPackPreload(
  book: CmsPlayableBookDetail | null | undefined,
  extras?: Pick<PreloadCmsBookPackOptions, 'maxPageLookahead' | 'concurrency'>
): Promise<PreloadCmsBookPackResult> | null {
  const manifest = resolveCmsBookMediaManifest(book);
  const bookId = String(book?.id || manifest?.bookId || '').trim();
  const assets = manifest?.assets?.filter((asset) => Boolean(asset?.url && asset?.key)) ?? [];
  const pages = Array.isArray(book?.pages) ? book.pages.filter((page) => Boolean(page?.type)) : [];
  if (!bookId || !assets.length) return null;

  return preloadCmsBookPackAssets({
    bookId,
    contentVersion: manifest?.contentVersion ?? book?.contentVersion ?? null,
    assets,
    pages,
    focusPageIndex: 0,
    mode: 'progressive',
    concurrency: extras?.concurrency ?? { imageAudio: 6, video: 1 },
    maxPageLookahead: extras?.maxPageLookahead,
  });
}

/** @internal Resets cached FileSystem probe between tests. */
export function __resetCmsBookMediaCacheForTests(): void {
  fileSystemUsable = null;
  inflight.clear();
  packSessions.clear();
}

export { collectRequiredCmsPageMediaUrls, isCmsPageMediaReady };
