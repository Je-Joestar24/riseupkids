/**
 * Star Cam mission content packs — game-style offline-ish saves.
 * Persists downloaded mission assets + manifest under documentDirectory so
 * preload can skip re-downloading after app restart when contentVersion matches.
 */

import * as FileSystem from 'expo-file-system/legacy';

import type { StarCamMediaAssetRef, StarCamMediaManifest } from '@/services/childStarCamService';
import { isLocalMediaUri } from '@/components/child/common/cms-player-media';
import { resolveStarCamMediaUrl } from '@/services/starCamMissionMedia';

const PACK_ROOT = 'starcam-mission-packs/';
const PACK_INDEX_FILE = 'pack-index.json';
const PACK_MANIFEST_FILE = 'pack-manifest.json';
const MAX_SAVED_MISSION_PACKS = 5;

export interface StarCamMissionPackIndexEntry {
  missionId: string;
  contentVersion: string | null;
  savedAt: string;
  assetCount: number;
  totalBytes: number;
}

export interface StarCamMissionPackIndex {
  version: 1;
  missions: StarCamMissionPackIndexEntry[];
}

export interface StarCamMissionPackManifest {
  missionId: string;
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
    await FileSystem.getInfoAsync(root);
    fileSystemUsable = true;
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

function missionPackDir(missionId: string): string {
  return `${packRootDir()}${sanitizeScope(missionId)}/`;
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

export async function loadMissionPackIndex(): Promise<StarCamMissionPackIndex> {
  const empty: StarCamMissionPackIndex = { version: 1, missions: [] };
  if (!(await canUseFileSystem())) return empty;
  const index = await readJsonFile<StarCamMissionPackIndex>(`${packRootDir()}${PACK_INDEX_FILE}`);
  if (!index || index.version !== 1 || !Array.isArray(index.missions)) return empty;
  return index;
}

async function saveMissionPackIndex(index: StarCamMissionPackIndex): Promise<void> {
  if (!(await ensureDir(packRootDir()))) return;
  await writeJsonFile(`${packRootDir()}${PACK_INDEX_FILE}`, index);
}

export async function loadMissionPackManifest(
  missionId: string
): Promise<StarCamMissionPackManifest | null> {
  if (!(await canUseFileSystem())) return null;
  return readJsonFile<StarCamMissionPackManifest>(`${missionPackDir(missionId)}${PACK_MANIFEST_FILE}`);
}

export function manifestAssetsToUriMap(
  manifest: StarCamMissionPackManifest | null | undefined
): Record<string, string> {
  if (!manifest?.assets) return {};
  const map: Record<string, string> = {};
  Object.values(manifest.assets).forEach((entry) => {
    if (entry.remoteUrl && entry.localUri) {
      map[entry.remoteUrl] = entry.localUri;
    }
  });
  return map;
}

export async function tryRestoreMissionPack(
  missionId: string,
  contentVersion: string | null | undefined
): Promise<{ uriMap: Record<string, string>; manifest: StarCamMissionPackManifest } | null> {
  const manifest = await loadMissionPackManifest(missionId);
  if (!manifest) return null;
  if (contentVersion && manifest.contentVersion !== contentVersion) return null;

  const uriMap: Record<string, string> = {};
  for (const entry of Object.values(manifest.assets || {})) {
    if (!entry.remoteUrl || !entry.localUri) continue;
    try {
      const info = await FileSystem.getInfoAsync(entry.localUri);
      if (!info.exists) return null;
      uriMap[entry.remoteUrl] = entry.localUri;
    } catch {
      return null;
    }
  }

  return { uriMap, manifest };
}

export interface SaveMissionPackInput {
  missionId: string;
  contentVersion: string | null;
  assets: StarCamMediaAssetRef[];
  uriMap: Record<string, string>;
}

export async function saveMissionPack(input: SaveMissionPackInput): Promise<StarCamMissionPackManifest | null> {
  if (!(await canUseFileSystem())) return null;

  const dir = missionPackDir(input.missionId);
  if (!(await ensureDir(dir))) return null;

  const assetEntries: StarCamMissionPackManifest['assets'] = {};
  let totalBytes = 0;

  for (const asset of input.assets) {
    const remote = resolveStarCamMediaUrl(asset.url);
    if (!remote) continue;
    const localUri = input.uriMap[remote] || remote;
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

  const manifest: StarCamMissionPackManifest = {
    missionId: input.missionId,
    contentVersion: input.contentVersion,
    savedAt: new Date().toISOString(),
    assets: assetEntries,
  };

  await writeJsonFile(`${dir}${PACK_MANIFEST_FILE}`, manifest);

  const index = await loadMissionPackIndex();
  const nextEntry: StarCamMissionPackIndexEntry = {
    missionId: input.missionId,
    contentVersion: input.contentVersion,
    savedAt: manifest.savedAt,
    assetCount: input.assets.length,
    totalBytes,
  };
  const withoutCurrent = index.missions.filter(
    (m) => sanitizeScope(m.missionId) !== sanitizeScope(input.missionId)
  );
  index.missions = [nextEntry, ...withoutCurrent].slice(0, MAX_SAVED_MISSION_PACKS);
  await saveMissionPackIndex(index);
  await pruneMissionPacks(MAX_SAVED_MISSION_PACKS);

  return manifest;
}

export async function pruneMissionPacks(keepCount = MAX_SAVED_MISSION_PACKS): Promise<void> {
  if (!(await canUseFileSystem())) return;
  const index = await loadMissionPackIndex();
  const keep = index.missions.slice(0, keepCount);
  const keepIds = new Set(keep.map((m) => sanitizeScope(m.missionId)));
  index.missions = keep;
  await saveMissionPackIndex(index);

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

export function resolveManifestAssets(manifest: StarCamMediaManifest | null | undefined): StarCamMediaAssetRef[] {
  return manifest?.assets?.filter((asset) => Boolean(asset?.url)) ?? [];
}

export function assetNeedsDownload(
  asset: StarCamMediaAssetRef,
  existing: StarCamMissionPackManifest | null | undefined
): boolean {
  const remote = resolveStarCamMediaUrl(asset.url);
  if (!remote || !/^https?:\/\//i.test(remote)) return false;
  const saved = existing?.assets?.[asset.key];
  if (!saved?.localUri) return true;
  if (asset.mediaId && saved.mediaId !== asset.mediaId) return true;
  if (asset.updatedAt && saved.mediaUpdatedAt !== asset.updatedAt) return true;
  return false;
}

export function getMissionPackAssetPath(missionId: string, assetKey: string, remoteUrl: string): string {
  return `${missionPackDir(missionId)}${sanitizeAssetFileName(assetKey, remoteUrl)}`;
}
