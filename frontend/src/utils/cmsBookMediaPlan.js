import { collectCmsPageMediaUrls, getMediaKind } from './cmsPlayerMedia';
import { resolveCmsAbsoluteMediaUrl, resolvePageType } from '../components/admin/common/cmsTest/shared';

/**
 * What a built-in book needs to download, and which page needs what.
 *
 * The server already sends every book with a media list (`mediaManifest`: each file's address, type and
 * last change) and a `contentVersion`, and the phone app downloads from it. The web uses the same list. Anything a
 * page refers to that the list does not mention is added from the page itself, so a page is never
 * "ready" while a file it needs is not being tracked.
 */

/** How long Next stays locked waiting for the next page's media before it plays from the internet instead. */
export const CMS_NEXT_GATE_TIMEOUT_MS = 10000;
export const CMS_NEXT_GATE_TIMEOUT_VIDEO_MS = 12000;

/** Pages that carry a video: the heavy ones the child must not be let onto before the video is there. */
export const isCmsVideoHeavyPage = (page) => {
  if (!page) return false;
  const type = resolvePageType(page.type);
  return type === 'demo' || type === 'reward';
};

export const getCmsNextGateTimeoutMs = (nextPage) =>
  isCmsVideoHeavyPage(nextPage) ? CMS_NEXT_GATE_TIMEOUT_VIDEO_MS : CMS_NEXT_GATE_TIMEOUT_MS;

/** Embeds (Bunny) are only ever streamed; there is no file to download. */
export const isStreamOnlyCmsMediaUrl = (url) => {
  if (!url) return false;
  return /mediadelivery\.net\/embed\//i.test(url);
};

const KINDS = new Set(['image', 'audio', 'video']);
const toKind = (hint, url) => {
  const normalized = typeof hint === 'string' ? hint.trim().toLowerCase() : '';
  return KINDS.has(normalized) ? normalized : getMediaKind(url);
};

/** Assets whose page cannot be told sort after every real page. */
export const UNKNOWN_PAGE_INDEX = 10000;

const pageIndexForAssetKey = (key, pages) => {
  const match = String(key || '').match(/^pages\.([^.]+)/);
  if (!match) return UNKNOWN_PAGE_INDEX;
  const pageId = match[1];
  const byId = pages.findIndex((page) => page?.pageId === pageId);
  if (byId >= 0) return byId;
  const orderMatch = pageId.match(/^order-(.+)$/);
  if (orderMatch) {
    const byOrder = pages.findIndex((page) => String(page?.order) === orderMatch[1]);
    if (byOrder >= 0) return byOrder;
  }
  return UNKNOWN_PAGE_INDEX;
};

/**
 * @param {{ book?: object|null, pages?: object[] }} input  `pages` are the pages the reader plays, in order.
 * @returns {{ bookId: string|null, contentVersion: string|null, assets: object[], pageUrls: string[][] }}
 */
export const buildCmsBookMediaPlan = ({ book = null, pages = [] } = {}) => {
  const playable = Array.isArray(pages) ? pages : [];
  const manifestAssets = Array.isArray(book?.mediaManifest?.assets) ? book.mediaManifest.assets : [];

  const byUrl = new Map();
  const pageUrlSets = playable.map(() => new Set());

  const note = (url, pageIndex, details = {}) => {
    if (!url) return;
    const existing = byUrl.get(url);
    if (existing) {
      if (pageIndex < existing.pageIndex) existing.pageIndex = pageIndex;
      if (!existing.key && details.key) existing.key = details.key;
      if (!existing.updatedAt && details.updatedAt) existing.updatedAt = details.updatedAt;
      if (!existing.kindHint && details.kind) {
        existing.kindHint = details.kind;
        existing.kind = toKind(details.kind, url);
      }
    } else {
      byUrl.set(url, {
        url,
        kind: toKind(details.kind, url),
        kindHint: details.kind || null,
        pageIndex,
        key: details.key || null,
        updatedAt: details.updatedAt || null,
        streamOnly: isStreamOnlyCmsMediaUrl(url),
      });
    }
    if (pageIndex < playable.length) pageUrlSets[pageIndex].add(url);
  };

  playable.forEach((page, index) => {
    collectCmsPageMediaUrls(page).forEach((url) => note(url, index));
  });

  manifestAssets.forEach((asset) => {
    const url = resolveCmsAbsoluteMediaUrl(asset?.url);
    note(url, pageIndexForAssetKey(asset?.key, playable), {
      key: asset?.key,
      kind: asset?.kind,
      updatedAt: asset?.updatedAt,
    });
  });

  const assets = Array.from(byUrl.values()).sort((a, b) => a.pageIndex - b.pageIndex);

  return {
    bookId: book?.mediaManifest?.bookId || book?.id || null,
    contentVersion: book?.contentVersion || book?.mediaManifest?.contentVersion || null,
    assets,
    pageUrls: pageUrlSets.map((set) => Array.from(set)),
  };
};

/** How soon the child can reach a page: the page they are on, the next, the one after, then the rest. */
export const getCmsPageBand = (pageIndex, focusPageIndex) => {
  const distance = pageIndex - focusPageIndex;
  if (distance < 0) return 100; // already seen: only needed if the child goes back, so after everything ahead
  if (distance <= 2) return distance; // the page in view, the one Next opens (its files unlock Next), the one after
  return 3 + Math.min(distance - 3, 50);
};

const kindRank = (kind, videoFirst) => {
  if (videoFirst) {
    if (kind === 'video') return 0;
    if (kind === 'audio') return 1;
    return 2;
  }
  if (kind === 'image') return 0;
  if (kind === 'audio') return 1;
  return 2;
};

/**
 * Sort key for a file still waiting to be downloaded. Lower goes first: nearer pages first; on the next page a
 * video goes before its pictures (it is the slow one); elsewhere pictures, then sound, then video.
 */
export const getCmsAssetPriority = (asset, pages, focusPageIndex) => {
  const band = getCmsPageBand(asset.pageIndex, focusPageIndex);
  const videoFirst = band === 1 && isCmsVideoHeavyPage(pages?.[asset.pageIndex]);
  return [band, kindRank(asset.kind, videoFirst), asset.pageIndex];
};

export const compareCmsAssetPriority = (a, b, pages, focusPageIndex) => {
  const left = getCmsAssetPriority(a, pages, focusPageIndex);
  const right = getCmsAssetPriority(b, pages, focusPageIndex);
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
};
