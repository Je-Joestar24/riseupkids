/**
 * Persists CMS book page playback flags (audio heard / video played) per book version.
 * Survives player close and app restart so already-read pages do not re-lock Next.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type CmsPagePlaybackFlagReason =
  | 'audio_finished'
  | 'video_finished'
  | 'no_media'
  | 'playback_error'
  | 'safety_timeout'
  | 'undetectable_stream';

export interface CmsPagePlaybackFlags {
  audioHeard: boolean;
  videoPlayed: boolean;
  audioReason?: CmsPagePlaybackFlagReason;
  videoReason?: CmsPagePlaybackFlagReason;
  updatedAt: string;
}

export interface CmsBookPagePlaybackRecord {
  bookId: string;
  contentVersion: string;
  pages: Record<string, CmsPagePlaybackFlags>;
}

const STORAGE_PREFIX = 'cms-book-page-flags:';

function normalizeId(value: string | null | undefined): string {
  return String(value || '').trim();
}

export function buildCmsBookPageFlagsStorageKey(
  bookId: string | null | undefined,
  contentVersion: string | null | undefined
): string | null {
  const id = normalizeId(bookId);
  const version = normalizeId(contentVersion) || 'unknown';
  if (!id) return null;
  return `${STORAGE_PREFIX}${id}:${version}`;
}

export function emptyCmsPagePlaybackFlags(): CmsPagePlaybackFlags {
  return {
    audioHeard: false,
    videoPlayed: false,
    updatedAt: new Date().toISOString(),
  };
}

export function mergeCmsPagePlaybackFlags(
  current: CmsPagePlaybackFlags | undefined,
  patch: Partial<CmsPagePlaybackFlags>
): CmsPagePlaybackFlags {
  const base = current || emptyCmsPagePlaybackFlags();
  return {
    audioHeard: Boolean(patch.audioHeard ?? base.audioHeard),
    videoPlayed: Boolean(patch.videoPlayed ?? base.videoPlayed),
    audioReason: patch.audioReason ?? base.audioReason,
    videoReason: patch.videoReason ?? base.videoReason,
    updatedAt: new Date().toISOString(),
  };
}

export function isCmsPageAudioHeard(
  record: CmsBookPagePlaybackRecord | null | undefined,
  pageId: string | null | undefined
): boolean {
  const id = normalizeId(pageId);
  if (!id) return false;
  return Boolean(record?.pages?.[id]?.audioHeard);
}

export function isCmsPageVideoPlayed(
  record: CmsBookPagePlaybackRecord | null | undefined,
  pageId: string | null | undefined
): boolean {
  const id = normalizeId(pageId);
  if (!id) return false;
  return Boolean(record?.pages?.[id]?.videoPlayed);
}

export async function loadCmsBookPagePlaybackRecord(
  bookId: string | null | undefined,
  contentVersion: string | null | undefined
): Promise<CmsBookPagePlaybackRecord> {
  const id = normalizeId(bookId);
  const version = normalizeId(contentVersion) || 'unknown';
  const empty: CmsBookPagePlaybackRecord = { bookId: id, contentVersion: version, pages: {} };
  const key = buildCmsBookPageFlagsStorageKey(id, version);
  if (!key) return empty;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as CmsBookPagePlaybackRecord;
    if (!parsed || typeof parsed !== 'object' || !parsed.pages || typeof parsed.pages !== 'object') {
      return empty;
    }
    return {
      bookId: id,
      contentVersion: version,
      pages: parsed.pages,
    };
  } catch {
    return empty;
  }
}

export async function saveCmsBookPagePlaybackRecord(
  record: CmsBookPagePlaybackRecord
): Promise<void> {
  const key = buildCmsBookPageFlagsStorageKey(record.bookId, record.contentVersion);
  if (!key) return;
  await AsyncStorage.setItem(key, JSON.stringify(record));
}

export async function markCmsPagePlaybackFlags(
  bookId: string | null | undefined,
  contentVersion: string | null | undefined,
  pageId: string | null | undefined,
  patch: Partial<CmsPagePlaybackFlags>
): Promise<CmsBookPagePlaybackRecord> {
  const id = normalizeId(pageId);
  const current = await loadCmsBookPagePlaybackRecord(bookId, contentVersion);
  if (!id) return current;
  const next: CmsBookPagePlaybackRecord = {
    ...current,
    pages: {
      ...current.pages,
      [id]: mergeCmsPagePlaybackFlags(current.pages[id], patch),
    },
  };
  await saveCmsBookPagePlaybackRecord(next);
  return next;
}
