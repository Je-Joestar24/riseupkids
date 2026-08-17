/**
 * CMS book progressive preload helpers — page readiness + asset priority.
 * Shared by pack download and the player Next-step gate (iOS + Android).
 */

import {
  isLocalMediaUri,
  type CmsMediaUriMap,
} from '@/components/child/common/cms-player-media';
import {
  resolveAudioUrl,
  resolveCmsAbsoluteMediaUrl,
  resolveImageUrl,
  resolveIntroBackgroundMusicUrl,
  resolvePageType,
  resolveRewardAudioUrl,
  resolveVideoUrl,
} from '@/components/child/common/cms-player-shared';
import type { CmsBookMediaAssetRef } from '@/services/cmsBookMediaManifest';
import type { CmsPlayablePage } from '@/services/cmsBooksPlayerService';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

/** How long Next stays locked waiting for next-page media before allowing remote stream. */
export const CMS_NEXT_GATE_TIMEOUT_MS = 10_000;
export const CMS_NEXT_GATE_TIMEOUT_VIDEO_MS = 12_000;

function isHttp(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function isStreamOnlyCmsMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (looksLikeBunnyExploreEmbedUrl(url)) return true;
  if (/mediadelivery\.net\/embed\//i.test(url)) return true;
  return false;
}

export function isCmsVideoHeavyPage(page: CmsPlayablePage | null | undefined): boolean {
  if (!page) return false;
  const type = resolvePageType(page.type);
  return type === 'demo' || type === 'reward';
}

function pushUrl(set: Set<string>, raw: string | null | undefined) {
  const absolute = resolveCmsAbsoluteMediaUrl(raw);
  if (absolute) set.add(absolute);
}

/** URLs the player needs before this page is safe to show / advance onto. */
export function collectRequiredCmsPageMediaUrls(
  page: CmsPlayablePage | null | undefined
): string[] {
  if (!page) return [];
  const set = new Set<string>();
  const type = resolvePageType(page.type);
  const media = (page.media || {}) as Record<string, unknown>;

  if (type === 'intro') {
    pushUrl(set, resolveImageUrl(page));
    pushUrl(set, resolveIntroBackgroundMusicUrl(page));
    return Array.from(set);
  }

  if (type === 'demo') {
    pushUrl(set, resolveVideoUrl(page));
    pushUrl(set, resolveImageUrl(page));
    return Array.from(set);
  }

  if (type === 'reward') {
    pushUrl(set, resolveVideoUrl(page));
    pushUrl(set, resolveImageUrl(page));
    pushUrl(set, resolveRewardAudioUrl(page));
    return Array.from(set);
  }

  // content + interactive (+ unknown)
  pushUrl(set, resolveImageUrl(page));
  pushUrl(set, resolveAudioUrl(page));

  const guideMedias = media.guideImageMedias as { url?: string }[] | undefined;
  (guideMedias ?? []).forEach((m) => pushUrl(set, m?.url));
  pushUrl(set, (media.guideImageMedia as { url?: string } | undefined)?.url);

  const sceneMedias = media.sceneImageMedias as { url?: string }[] | undefined;
  (sceneMedias ?? []).forEach((m) => pushUrl(set, m?.url));
  pushUrl(set, (media.sceneImageMedia as { url?: string } | undefined)?.url);

  const opts = page.interaction?.options ?? [];
  opts.forEach((o) => {
    const opt = o as Record<string, unknown>;
    pushUrl(set, (opt.imageMedia as { url?: string } | undefined)?.url);
    pushUrl(set, (opt.audioMedia as { url?: string } | undefined)?.url);
    pushUrl(set, opt.imageUrl as string | undefined);
    pushUrl(set, opt.audioUrl as string | undefined);
  });

  const dropZones = page.interaction?.dropZones ?? [];
  dropZones.forEach((zone) => {
    const z = zone as Record<string, unknown>;
    pushUrl(set, z.audioUrl as string | undefined);
    pushUrl(set, (z.audioMedia as { url?: string } | undefined)?.url);
  });

  return Array.from(set);
}

export interface CmsPageMediaReadyOptions {
  /**
   * When true, remote http(s) URLs count as ready (stream / network play).
   * Used after the Next-gate timeout so kids are never stuck forever.
   */
  allowRemoteStream?: boolean;
}

function looksLikeVideoUrl(remoteUrl: string): boolean {
  return (
    /\.(mp4|webm|mov|m4v)(\?|$)/i.test(remoteUrl) ||
    /\/videos?\//i.test(remoteUrl) ||
    /mediadelivery\.net/i.test(remoteUrl)
  );
}

function isUrlReady(
  remoteUrl: string,
  uriMap: CmsMediaUriMap | null | undefined,
  options: CmsPageMediaReadyOptions
): boolean {
  if (!remoteUrl) return true;
  if (isStreamOnlyCmsMediaUrl(remoteUrl)) return true;

  const mapped = uriMap?.[remoteUrl];
  if (mapped && isLocalMediaUri(mapped)) return true;

  // After gate timeout: allow remote http playback (expo-av streams on iOS + Android).
  if (options.allowRemoteStream && isHttp(remoteUrl)) return true;

  const isVideo = looksLikeVideoUrl(remoteUrl);
  // Videos stay locked until local (or stream fallback). Images/audio may use remote once mapped.
  if (isVideo) return false;
  if (mapped && isHttp(mapped)) return true;

  return false;
}

/** True when every required URL for the page is safe to play. */
export function isCmsPageMediaReady(
  page: CmsPlayablePage | null | undefined,
  uriMap: CmsMediaUriMap | null | undefined,
  options: CmsPageMediaReadyOptions = {}
): boolean {
  const urls = collectRequiredCmsPageMediaUrls(page);
  if (!urls.length) return true;
  return urls.every((url) => isUrlReady(url, uriMap, options));
}

function pageIndexForAssetKey(assetKey: string, pages: CmsPlayablePage[]): number {
  const match = String(assetKey || '').match(/^pages\.([^.]+)/);
  if (!match) return 10_000;
  const pageId = match[1];
  const idx = pages.findIndex((p) => p.pageId === pageId);
  if (idx >= 0) return idx;
  // Fallback: order-based keys from older manifests
  const orderMatch = pageId.match(/^order-(.+)$/);
  if (orderMatch) {
    const byOrder = pages.findIndex((p) => String(p.order) === orderMatch[1]);
    if (byOrder >= 0) return byOrder;
  }
  return 10_000;
}

function kindRank(kind: string | null | undefined, pageIsVideoHeavy: boolean): number {
  const k = String(kind || '').toLowerCase();
  if (pageIsVideoHeavy) {
    if (k === 'video') return 0;
    if (k === 'audio') return 1;
    if (k === 'image') return 2;
    return 3;
  }
  if (k === 'image') return 0;
  if (k === 'audio') return 1;
  if (k === 'video') return 2;
  return 3;
}

function pageBand(pageIndex: number, focusPageIndex: number): number {
  if (pageIndex === focusPageIndex) return 0;
  if (pageIndex === focusPageIndex + 1) return 1; // next — unlock Next
  if (pageIndex === focusPageIndex + 2) return 2;
  if (pageIndex < focusPageIndex) return 8; // already visited
  return 3 + Math.min(pageIndex, 50);
}

export function getCmsBookAssetPageIndex(
  assetKey: string,
  pages: CmsPlayablePage[]
): number {
  return pageIndexForAssetKey(assetKey, pages);
}

/** True when this asset belongs to the current page or the next N pages. */
export function isCmsBookAssetWithinLookahead(
  assetKey: string,
  pages: CmsPlayablePage[],
  focusPageIndex: number,
  maxPageLookahead: number
): boolean {
  const pageIndex = pageIndexForAssetKey(assetKey, pages);
  if (pageIndex >= 10_000) return false;
  return pageIndex <= Math.max(0, focusPageIndex) + Math.max(0, maxPageLookahead);
}

/**
 * Near-term videos (current, next, +1) should share the pipe with page-1 images.
 * Distant MP4s wait until those nearby videos finish so they don't starve start/next.
 */
export function isCmsNearTermVideoAsset(
  asset: CmsBookMediaAssetRef,
  pages: CmsPlayablePage[],
  focusPageIndex = 0,
  nearPageCount = 2
): boolean {
  const pageIndex = pageIndexForAssetKey(asset.key, pages);
  if (pageIndex >= 10_000) return false;
  const focus = Math.max(0, focusPageIndex);
  return pageIndex >= focus && pageIndex <= focus + Math.max(0, nearPageCount);
}

/**
 * Order manifest assets so page 0 (+ next page / videos) download first.
 * Stable for iOS + Android — pure sort, no Platform branching.
 */
export function prioritizeCmsBookAssetsForProgressivePreload(
  assets: CmsBookMediaAssetRef[],
  pages: CmsPlayablePage[],
  focusPageIndex = 0,
  maxPageLookahead?: number
): CmsBookMediaAssetRef[] {
  const focus = Math.max(0, focusPageIndex);
  const limited =
    typeof maxPageLookahead === 'number'
      ? assets.filter((asset) =>
          isCmsBookAssetWithinLookahead(asset.key, pages, focus, maxPageLookahead)
        )
      : assets;
  const decorated = limited.map((asset, originalIndex) => {
    const pageIndex = pageIndexForAssetKey(asset.key, pages);
    const page = pages[pageIndex];
    const videoHeavy = isCmsVideoHeavyPage(page);
    const band = pageBand(pageIndex, focus);
    const kind = kindRank(asset.kind, videoHeavy && pageIndex === focus + 1);
    return { asset, originalIndex, band, kind, pageIndex };
  });

  decorated.sort((a, b) => {
    if (a.band !== b.band) return a.band - b.band;
    if (a.kind !== b.kind) return a.kind - b.kind;
    if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
    return a.originalIndex - b.originalIndex;
  });

  return decorated.map((d) => d.asset);
}

/** URLs for first playable page(s) — used by fallback (non-manifest) progressive preload. */
export function collectCmsStartGateMediaUrls(
  pages: CmsPlayablePage[],
  lookaheadPages = 1
): string[] {
  const set = new Set<string>();
  const limit = Math.min(pages.length, Math.max(1, lookaheadPages + 1));
  for (let i = 0; i < limit; i += 1) {
    collectRequiredCmsPageMediaUrls(pages[i]).forEach((url) => set.add(url));
  }
  return Array.from(set);
}

export function getCmsNextGateTimeoutMs(nextPage: CmsPlayablePage | null | undefined): number {
  return isCmsVideoHeavyPage(nextPage) ? CMS_NEXT_GATE_TIMEOUT_VIDEO_MS : CMS_NEXT_GATE_TIMEOUT_MS;
}
