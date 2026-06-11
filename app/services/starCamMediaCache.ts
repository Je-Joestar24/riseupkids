/**
 * Star Cam mission media — download to app document storage for reliable APK playback.
 * Uses documentDirectory (persists across sessions) with cacheDirectory fallback.
 */

import * as FileSystem from 'expo-file-system/legacy';

import { isLocalMediaUri } from '@/components/child/common/cms-player-media';

const MEDIA_SUBDIR = 'starcam-mission-media/';
const inflight = new Map<string, Promise<string>>();
const memoryMap = new Map<string, string>();

let fileSystemUsable: boolean | null = null;

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
  return m ? `.${m[1]}` : '.bin';
}

function isHttp(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/** Probe once whether expo-file-system native module works (APK-safe). */
async function canUseFileSystem(): Promise<boolean> {
  if (fileSystemUsable !== null) return fileSystemUsable;
  const root = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!root) {
    fileSystemUsable = false;
    return false;
  }
  try {
    await FileSystem.getInfoAsync(root);
    fileSystemUsable = true;
  } catch {
    fileSystemUsable = false;
  }
  return fileSystemUsable;
}

async function ensureMediaDir(): Promise<string> {
  if (!(await canUseFileSystem())) return '';
  const root = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!root) return '';
  const dir = `${root}${MEDIA_SUBDIR}`;
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  } catch {
    fileSystemUsable = false;
    return '';
  }
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
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return null;
}

/**
 * Download one remote asset; returns local file:// URI or the original remote URL on failure.
 */
export async function cacheStarCamMediaUrl(remoteUrl: string): Promise<string> {
  if (!remoteUrl || !isHttp(remoteUrl)) return remoteUrl;

  if (!(await canUseFileSystem())) return remoteUrl;

  const memo = memoryMap.get(remoteUrl);
  if (memo && (await fileExists(memo))) return memo;

  const existing = inflight.get(remoteUrl);
  if (existing) return existing;

  const task = (async () => {
    try {
      const dir = await ensureMediaDir();
      if (!dir) return remoteUrl;

      const dest = `${dir}${simpleHash(remoteUrl)}${extensionFromUrl(remoteUrl)}`;
      if (await fileExists(dest)) {
        memoryMap.set(remoteUrl, dest);
        return dest;
      }

      const local = await downloadWithRetry(remoteUrl, dest);
      if (local) {
        memoryMap.set(remoteUrl, local);
        return local;
      }
    } catch {
      fileSystemUsable = false;
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

export interface StarCamPreloadResult {
  failed: string[];
  uriMap: Record<string, string>;
  usedDiskCache: boolean;
}

/** Preload mission media with real per-file progress (0–100). */
export async function preloadStarCamMediaUrls(
  urls: string[],
  onProgress?: (percent: number) => void,
  concurrency = 3
): Promise<StarCamPreloadResult> {
  const unique = Array.from(new Set(urls.filter((u) => u && isHttp(u))));
  const failed: string[] = [];
  const uriMap: Record<string, string> = {};
  const diskOk = await canUseFileSystem();

  if (!unique.length) {
    onProgress?.(100);
    return { failed, uriMap, usedDiskCache: diskOk };
  }

  if (!diskOk) {
    unique.forEach((remote) => {
      uriMap[remote] = remote;
      failed.push(remote);
    });
    onProgress?.(100);
    return { failed, uriMap, usedDiskCache: false };
  }

  let completed = 0;
  const report = () => {
    onProgress?.(Math.round((completed / unique.length) * 100));
  };

  const queue = [...unique];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const remote = queue.shift();
      if (!remote) break;
      const resolved = await cacheStarCamMediaUrl(remote);
      uriMap[remote] = resolved;
      if (!isLocalMediaUri(resolved)) {
        failed.push(remote);
      }
      completed += 1;
      report();
    }
  });

  await Promise.all(workers);
  onProgress?.(100);
  return { failed, uriMap, usedDiskCache: true };
}
