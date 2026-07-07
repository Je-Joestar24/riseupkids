/**
 * Collect remote URLs for Star Cam mission media (start, practice, hunt, completion).
 */

import { BACKEND_ORIGIN } from '@/config';
import type {
  StarCamChildMissionStartPayload,
  StarCamHuntItem,
  StarCamPracticeItem,
} from '@/services/childStarCamService';

/** Normalize mission route keys (slug, missionId, or document id). */
export function normalizeStarCamMissionKey(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/** True when a route mission key matches the loaded flow for that mission. */
export function starCamMissionKeysMatch(
  routeMissionKey: string | null | undefined,
  flow: StarCamChildMissionStartPayload | null | undefined
): boolean {
  const routeKey = normalizeStarCamMissionKey(routeMissionKey);
  if (!routeKey || !flow?.mission) return false;

  const candidates = [flow.mission.missionId, flow.mission.id, routeMissionKey]
    .map(normalizeStarCamMissionKey)
    .filter(Boolean);

  return candidates.includes(routeKey);
}

export function getStarCamMissionKeyFromFlow(
  flow: StarCamChildMissionStartPayload | null | undefined
): string | null {
  const key = flow?.mission?.missionId || flow?.mission?.id || null;
  return key ? normalizeStarCamMissionKey(key) : null;
}

/** Only expose cached URIs when they belong to the active mission flow. */
export function getStarCamScopedMediaCache(
  routeMissionKey: string | null | undefined,
  cachedMissionKey: string | null | undefined,
  cacheMap: Record<string, string>,
  flow: StarCamChildMissionStartPayload | null | undefined
): Record<string, string> {
  if (!starCamMissionKeysMatch(routeMissionKey, flow)) return {};

  const cacheMatchesMission = starCamCacheKeysMatch(cachedMissionKey, routeMissionKey, flow);

  if (!cacheMatchesMission) return {};
  return cacheMap;
}

/** True when downloaded media belongs to the same mission as the route + flow. */
export function starCamCacheKeysMatch(
  cachedMissionKey: string | null | undefined,
  routeMissionKey: string | null | undefined,
  flow: StarCamChildMissionStartPayload | null | undefined
): boolean {
  const cacheKey = normalizeStarCamMissionKey(cachedMissionKey);
  if (!cacheKey) return false;

  const routeKey = normalizeStarCamMissionKey(routeMissionKey);
  if (routeKey && cacheKey === routeKey) return true;

  const flowKey = getStarCamMissionKeyFromFlow(flow);
  if (flowKey && cacheKey === flowKey) return true;

  return (
    starCamMissionKeysMatch(routeMissionKey, flow) &&
    starCamMissionKeysMatch(cachedMissionKey, flow)
  );
}

export function resolveStarCamMediaUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${BACKEND_ORIGIN}${path}`;
}

function pushUrl(set: Set<string>, url: string | null | undefined) {
  const resolved = resolveStarCamMediaUrl(url);
  if (resolved) set.add(resolved);
}

function collectPracticeItemUrls(set: Set<string>, item: StarCamPracticeItem | null | undefined) {
  if (!item) return;
  pushUrl(set, item.imageUrl);
  pushUrl(set, item.audioUrl);
  pushUrl(set, item.pronunciationVideoUrl);
  pushUrl(set, item.introAudioUrl);
  pushUrl(set, item.tryAgainAudioUrl);
  pushUrl(set, item.successAudioUrl);
}

function collectHuntItemUrls(set: Set<string>, item: StarCamHuntItem) {
  pushUrl(set, item.questionAudioUrl);
  pushUrl(set, item.successAudioUrl);
  pushUrl(set, item.tryAgainAudioUrl);
}

/** Every remote asset referenced by a mission start-flow payload. */
export function collectStarCamMissionMediaUrls(
  flow: StarCamChildMissionStartPayload | null | undefined
): string[] {
  if (!flow?.flow) return [];

  const set = new Set<string>();
  const { start, practice, starCam, completion } = flow.flow;

  pushUrl(set, start.missionImageUrl);
  pushUrl(set, start.introImageUrl);
  pushUrl(set, start.shortVideoUrl);
  pushUrl(set, start.introAudioUrl);

  (practice.items || []).forEach((item) => collectPracticeItemUrls(set, item));
  collectPracticeItemUrls(set, practice.featuredItem);

  (starCam.items || []).forEach((item) => collectHuntItemUrls(set, item));

  pushUrl(set, completion.rewardImageUrl);
  pushUrl(set, completion.rewardAudioUrl);
  pushUrl(set, completion.rewardVideoUrl);

  return Array.from(set);
}

/** Practice screen only (videos + sample images + practice audio). */
export function collectStarCamPracticeMediaUrls(
  flow: StarCamChildMissionStartPayload | null | undefined
): string[] {
  if (!flow?.flow?.practice) return [];
  const set = new Set<string>();
  (flow.flow.practice.items || []).forEach((item) => collectPracticeItemUrls(set, item));
  collectPracticeItemUrls(set, flow.flow.practice.featuredItem);
  return Array.from(set);
}

export function pickCachedMediaUri(
  remoteUrl: string | null | undefined,
  cacheMap: Record<string, string>
): string | null {
  const remote = resolveStarCamMediaUrl(remoteUrl);
  if (!remote) return null;
  return cacheMap[remote] ?? remote;
}

/** Resolve a playable URI (local cache file:// or remote https) for AV/Image components. */
export function resolveStarCamPlayableUrl(
  url: string | null | undefined,
  cacheMap: Record<string, string> = {}
): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^(file:|content:)/i.test(trimmed)) return trimmed;
  return pickCachedMediaUri(trimmed, cacheMap);
}
