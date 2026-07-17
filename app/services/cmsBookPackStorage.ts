/**
 * CMS built-in book content packs — durable saves under documentDirectory.
 * Skips re-downloading when contentVersion matches; re-downloads only changed assets.
 */

import * as FileSystem from 'expo-file-system/legacy';

import { resolveCmsAbsoluteMediaUrl } from '@/components/child/common/cms-player-shared';
import { isLocalMediaUri } from '@/components/child/common/cms-player-media';
import type { CmsBookMediaAssetRef, CmsBookMediaManifest } from '@/services/cmsBookMediaManifest';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

const PACK_ROOT = 'cms-book-packs/';
const PACK_INDEX_FILE = 'pack-index.json';
const PACK_MANIFEST_FILE = 'pack-manifest.json';
const MAX_SAVED_BOOK_PACKS = 8;

export interface CmsBookPackIndexEntry {
  bookId: string;
  contentVersion: string | null;
  savedAt: string;
  assetCount: number;
  totalBytes: number;
}

export interface CmsBookPackIndex {
  version: 1;
  books: CmsBookPackIndexEntry[];
}

export interface CmsBookPackManifest {
  bookId: string;
  contentVersion: string | null;
  savedAt: string;
  assets: Record<
    string,
    {
      assetKey: string;
      remoteUrl: string;
      localUri: string;
      mediaId: string | null;
      mediaUpdatedAt: string | null;
      bytes: number;
    }
  >;
}

let fileSystemUsable: boolean | null = null;

function normalizeRemoteUrl(raw: string | null | undefined): string {
  return resolveCmsAbsoluteMediaUrl(raw) || String(raw || '').trim();
}

function isLikelyVideoUrl(url: string): boolean {
  if (!url) return false;
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)) return true;
  if (/(?:\/video|\/videos|videoasset|mediadelivery|\/embed\/)/i.test(url)) return true;
  return false;
}

function isStreamingAsset(url: string, kind?: string | null): boolean {
  if (kind === 'video') return true;
  if (looksLikeBunnyExploreEmbedUrl(url)) return true;
  return isLikelyVideoUrl(url);
}

function sanitizeScope(value: string): string {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 120);
}

function sanitizeAssetFileName(assetKey: string, remoteUrl: string): string {
  const extMatch = remoteUrl.split('?')[0]?.match(/\.([a-z0-9]{1,8})$/i);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '.bin';
  const safeKey = String(assetKey || 'asset')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 96);
  return `${safeKey}${ext}`;
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

async function ensureDir(dir: string): Promise<boolean> {
  if (!(await canUseFileSystem())) return false;
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return true;
  } catch {
    return false;
  }
}

function packRootDir(): string {
  const root = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
  return `${root}${PACK_ROOT}`;
}

function bookPackDir(bookId: string): string {
  return `${packRootDir()}${sanitizeScope(bookId)}/`;
}

async function readJsonFile<T>(uri: string): Promise<T | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(uri);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(uri: string, data: unknown): Promise<void> {
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(data, null, 0));
}

async function fileSize(uri: string): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && typeof info.size === 'number' ? info.size : 0;
  } catch {
    return 0;
  }
}

export async function loadBookPackIndex(): Promise<CmsBookPackIndex> {
  const empty: CmsBookPackIndex = { version: 1, books: [] };
  if (!(await canUseFileSystem())) return empty;
  const index = await readJsonFile<CmsBookPackIndex>(`${packRootDir()}${PACK_INDEX_FILE}`);
  if (!index || index.version !== 1 || !Array.isArray(index.books)) return empty;
  return index;
}

async function saveBookPackIndex(index: CmsBookPackIndex): Promise<void> {
  if (!(await ensureDir(packRootDir()))) return;
  await writeJsonFile(`${packRootDir()}${PACK_INDEX_FILE}`, index);
}

export async function loadBookPackManifest(bookId: string): Promise<CmsBookPackManifest | null> {
  if (!(await canUseFileSystem())) return null;
  return readJsonFile<CmsBookPackManifest>(`${bookPackDir(bookId)}${PACK_MANIFEST_FILE}`);
}

export function manifestAssetsToUriMap(
  manifest: CmsBookPackManifest | null | undefined
): Record<string, string> {
  if (!manifest?.assets) return {};
  const map: Record<string, string> = {};
  Object.values(manifest.assets).forEach((entry) => {
    const remote = normalizeRemoteUrl(entry.remoteUrl);
    if (remote && entry.localUri) {
      map[remote] = entry.localUri;
    }
  });
  return map;
}

export interface LoadBookPackResult {
  manifest: CmsBookPackManifest | null;
  uriMap: Record<string, string>;
  fullyRestored: boolean;
}

/** Load saved pack when contentVersion matches; returns partial uriMap for incremental repair. */
export async function loadBookPackForPreload(
  bookId: string,
  contentVersion: string | null | undefined
): Promise<LoadBookPackResult> {
  const manifest = await loadBookPackManifest(bookId);
  if (!manifest) return { manifest: null, uriMap: {}, fullyRestored: false };
  if (contentVersion && manifest.contentVersion !== contentVersion) {
    return { manifest: null, uriMap: {}, fullyRestored: false };
  }

  const uriMap: Record<string, string> = {};
  let allPresent = Object.keys(manifest.assets || {}).length > 0;

  for (const entry of Object.values(manifest.assets || {})) {
    const remote = normalizeRemoteUrl(entry.remoteUrl);
    if (!remote) continue;

    if (isStreamingAsset(remote)) {
      uriMap[remote] = remote;
      continue;
    }

    if (!isLocalMediaUri(entry.localUri)) {
      allPresent = false;
      continue;
    }

    try {
      const info = await FileSystem.getInfoAsync(entry.localUri);
      if (!info.exists) {
        allPresent = false;
        continue;
      }
      uriMap[remote] = entry.localUri;
    } catch {
      allPresent = false;
    }
  }

  return { manifest, uriMap, fullyRestored: allPresent && Object.keys(uriMap).length > 0 };
}

export function getBookPackAssetPath(bookId: string, assetKey: string, remoteUrl: string): string {
  return `${bookPackDir(bookId)}${sanitizeAssetFileName(assetKey, remoteUrl)}`;
}

/** Ensures the on-disk folder for a book pack exists before asset downloads. */
export async function ensureBookPackDir(bookId: string): Promise<boolean> {
  return ensureDir(bookPackDir(bookId));
}

export function assetNeedsDownload(
  asset: CmsBookMediaAssetRef,
  existing: CmsBookPackManifest | null | undefined,
  uriMap: Record<string, string>
): boolean {
  const remote = normalizeRemoteUrl(asset.url);
  if (!remote || !/^https?:\/\//i.test(remote)) return false;
  if (isStreamingAsset(remote, asset.kind)) return false;

  const saved = existing?.assets?.[asset.key];
  const mapped = uriMap[remote];

  if (saved?.localUri && isLocalMediaUri(saved.localUri) && mapped && isLocalMediaUri(mapped)) {
    if (asset.mediaId && saved.mediaId !== asset.mediaId) return true;
    if (asset.updatedAt && saved.mediaUpdatedAt !== asset.updatedAt) return true;
    return false;
  }
  return true;
}

export interface SaveBookPackInput {
  bookId: string;
  contentVersion: string | null;
  assets: CmsBookMediaAssetRef[];
  uriMap: Record<string, string>;
}

export async function saveBookPack(input: SaveBookPackInput): Promise<CmsBookPackManifest | null> {
  if (!(await canUseFileSystem())) return null;

  const dir = bookPackDir(input.bookId);
  if (!(await ensureDir(dir))) return null;

  const assetEntries: CmsBookPackManifest['assets'] = {};
  let totalBytes = 0;

  for (const asset of input.assets) {
    const remote = normalizeRemoteUrl(asset.url);
    if (!remote) continue;
    const localUri = input.uriMap[remote] || input.uriMap[asset.url] || remote;
    const bytes = isLocalMediaUri(localUri) ? await fileSize(localUri) : 0;
    totalBytes += bytes;
    assetEntries[asset.key] = {
      assetKey: asset.key,
      remoteUrl: remote,
      localUri,
      mediaId: asset.mediaId ?? null,
      mediaUpdatedAt: asset.updatedAt ?? null,
      bytes,
    };
  }

  const manifest: CmsBookPackManifest = {
    bookId: input.bookId,
    contentVersion: input.contentVersion,
    savedAt: new Date().toISOString(),
    assets: assetEntries,
  };

  await writeJsonFile(`${dir}${PACK_MANIFEST_FILE}`, manifest);

  const index = await loadBookPackIndex();
  const nextEntry: CmsBookPackIndexEntry = {
    bookId: input.bookId,
    contentVersion: input.contentVersion,
    savedAt: manifest.savedAt,
    assetCount: input.assets.length,
    totalBytes,
  };
  const withoutCurrent = index.books.filter(
    (entry) => sanitizeScope(entry.bookId) !== sanitizeScope(input.bookId)
  );
  index.books = [nextEntry, ...withoutCurrent].slice(0, MAX_SAVED_BOOK_PACKS);
  await saveBookPackIndex(index);
  await pruneBookPacks(MAX_SAVED_BOOK_PACKS);

  return manifest;
}

export async function pruneBookPacks(keepCount = MAX_SAVED_BOOK_PACKS): Promise<void> {
  if (!(await canUseFileSystem())) return;
  const index = await loadBookPackIndex();
  const keep = index.books.slice(0, keepCount);
  const keepIds = new Set(keep.map((entry) => sanitizeScope(entry.bookId)));
  index.books = keep;
  await saveBookPackIndex(index);

  try {
    const root = packRootDir();
    const listing = await FileSystem.readDirectoryAsync(root);
    await Promise.all(
      listing
        .filter((name) => name !== PACK_INDEX_FILE)
        .filter((name) => !keepIds.has(sanitizeScope(name)))
        .map(async (name) => {
          try {
            await FileSystem.deleteAsync(`${root}${name}`, { idempotent: true });
          } catch {
            // best effort
          }
        })
    );
  } catch {
    // index-only prune is still useful
  }
}

export function packMatchesManifest(
  saved: CmsBookPackManifest | null | undefined,
  manifest: CmsBookMediaManifest | null | undefined
): boolean {
  if (!saved || !manifest) return false;
  return saved.contentVersion === manifest.contentVersion;
}

/** @internal Resets cached FileSystem probe between tests. */
export function __resetCmsBookPackStorageForTests(): void {
  fileSystemUsable = null;
}
