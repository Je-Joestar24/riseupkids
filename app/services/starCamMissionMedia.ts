/**
 * Collect remote URLs for Star Cam mission media (start, practice, hunt, completion).
 */

import { BACKEND_ORIGIN } from '@/config';
import type {
  StarCamChildMissionStartPayload,
  StarCamHuntItem,
  StarCamPracticeItem,
} from '@/services/childStarCamService';

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
