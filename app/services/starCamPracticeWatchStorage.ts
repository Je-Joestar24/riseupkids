/**
 * Persists which Star Cam practice vocabulary videos a child has already watched
 * for a given mission (used to show "Skip now" on repeat views).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'starcam-practice-watched:';

function normalizeMissionKey(missionId: string): string {
  return String(missionId || '')
    .trim()
    .toLowerCase();
}

function normalizeItemKey(itemKey: string): string {
  return String(itemKey || '')
    .trim()
    .toLowerCase();
}

function buildStorageKey(childId: string, missionId: string): string {
  return `${STORAGE_PREFIX}${String(childId).trim()}:${normalizeMissionKey(missionId)}`;
}

export function buildStarCamPracticeItemKey(order: number, target: string | null | undefined): string {
  const safeTarget = String(target || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  return `${order}:${safeTarget || 'item'}`;
}

export async function loadWatchedPracticeItemKeys(
  childId: string | null | undefined,
  missionId: string | null | undefined
): Promise<Set<string>> {
  if (!childId || !missionId) return new Set();
  try {
    const raw = await AsyncStorage.getItem(buildStorageKey(childId, missionId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((key) => normalizeItemKey(String(key))).filter(Boolean));
  } catch {
    return new Set();
  }
}

export async function markPracticeItemWatched(
  childId: string | null | undefined,
  missionId: string | null | undefined,
  itemKey: string
): Promise<Set<string>> {
  const normalizedKey = normalizeItemKey(itemKey);
  if (!childId || !missionId || !normalizedKey) return new Set();

  const existing = await loadWatchedPracticeItemKeys(childId, missionId);
  if (existing.has(normalizedKey)) return existing;

  const next = new Set(existing);
  next.add(normalizedKey);
  await AsyncStorage.setItem(buildStorageKey(childId, missionId), JSON.stringify(Array.from(next)));
  return next;
}

export function isPracticeItemWatched(watchedKeys: Set<string>, itemKey: string | null | undefined): boolean {
  if (!itemKey) return false;
  return watchedKeys.has(normalizeItemKey(itemKey));
}
