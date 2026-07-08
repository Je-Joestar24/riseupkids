import type { CmsPlayableBookDetail, CmsPlayablePage } from '@/services/cmsBooksPlayerService';
import { resolveCmsAbsoluteMediaUrl } from '@/components/child/common/cms-player-shared';

export interface CmsBookMediaAssetRef {
  key: string;
  mediaId: string | null;
  url: string;
  updatedAt: string | null;
  kind: string | null;
}

export interface CmsBookMediaManifest {
  bookId: string;
  contentVersion: string;
  assets: CmsBookMediaAssetRef[];
}

function asIsoDate(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function pushAsset(list: CmsBookMediaAssetRef[], asset: CmsBookMediaAssetRef | null) {
  if (!asset?.url) return;
  list.push(asset);
}

function mediaAsset(
  key: string,
  media: { id?: string; url?: string | null; type?: string | null; updatedAt?: unknown } | null | undefined,
  kind: string | null = null
): CmsBookMediaAssetRef | null {
  const url = resolveCmsAbsoluteMediaUrl(media?.url ?? null);
  if (!url) return null;
  return {
    key,
    mediaId: media?.id ? String(media.id) : null,
    url,
    updatedAt: asIsoDate(media?.updatedAt),
    kind: kind || (typeof media?.type === 'string' ? media.type : null),
  };
}

export function buildCmsBookContentVersion(
  book: Pick<CmsPlayableBookDetail, 'version' | 'updatedAt'> | null | undefined
): string {
  const version = Number(book?.version) || 1;
  const updatedAt = asIsoDate(book?.updatedAt);
  return updatedAt ? `${version}:${updatedAt}` : String(version);
}

function collectAssetsFromPage(page: CmsPlayablePage): CmsBookMediaAssetRef[] {
  const assets: CmsBookMediaAssetRef[] = [];
  const pageId = page.pageId || `order-${page.order ?? 'x'}`;
  const prefix = `pages.${pageId}`;
  const media = page.media || {};

  pushAsset(assets, mediaAsset(`${prefix}.image`, media.imageMedia, 'image'));
  pushAsset(assets, mediaAsset(`${prefix}.audio`, media.audioMedia, 'audio'));
  pushAsset(assets, mediaAsset(`${prefix}.video`, media.videoMedia, 'video'));
  pushAsset(assets, mediaAsset(`${prefix}.instructionAudio`, media.instructionAudioMedia, 'audio'));
  pushAsset(assets, mediaAsset(`${prefix}.backgroundImage`, media.backgroundImageMedia, 'image'));
  pushAsset(assets, mediaAsset(`${prefix}.guideImage`, media.guideImageMedia, 'image'));

  (media.guideImageMedias || []).forEach((item, idx) => {
    pushAsset(assets, mediaAsset(`${prefix}.guideImages[${idx + 1}]`, item, 'image'));
  });

  (page.interaction?.options || []).forEach((option, idx) => {
    const optPrefix = `${prefix}.options[${option.optionId || idx + 1}]`;
    pushAsset(assets, mediaAsset(`${optPrefix}.image`, option.imageMedia, 'image'));
    pushAsset(assets, mediaAsset(`${optPrefix}.audio`, option.audioMedia, 'audio'));
  });

  (page.interaction?.dropZones || []).forEach((zone, idx) => {
    const zonePrefix = `${prefix}.dropZones[${zone.zoneId || idx + 1}]`;
    const zoneRecord = zone as { audioMedia?: { id?: string; url?: string | null }; audioUrl?: string };
    pushAsset(
      assets,
      mediaAsset(
        `${zonePrefix}.audio`,
        zoneRecord.audioMedia ?? (zoneRecord.audioUrl ? { url: zoneRecord.audioUrl } : null),
        'audio'
      )
    );
  });

  return assets;
}

/** Client fallback when API manifest is missing (older backend). */
export function buildCmsBookMediaManifestFromDetail(
  book: CmsPlayableBookDetail | null | undefined
): CmsBookMediaManifest | null {
  if (!book?.id || !book.pages?.length) return null;

  const assets: CmsBookMediaAssetRef[] = [];
  book.pages.forEach((page) => {
    assets.push(...collectAssetsFromPage(page));
  });

  const deduped = new Map<string, CmsBookMediaAssetRef>();
  assets.forEach((asset) => {
    if (!deduped.has(asset.key)) deduped.set(asset.key, asset);
  });

  return {
    bookId: book.id,
    contentVersion: book.contentVersion ?? buildCmsBookContentVersion(book),
    assets: Array.from(deduped.values()),
  };
}

export function resolveCmsBookMediaManifest(
  book: CmsPlayableBookDetail | null | undefined
): CmsBookMediaManifest | null {
  if (!book) return null;
  if (book.mediaManifest?.assets?.length) {
    return {
      bookId: book.mediaManifest.bookId || book.id,
      contentVersion: book.mediaManifest.contentVersion || buildCmsBookContentVersion(book),
      assets: book.mediaManifest.assets
        .map((asset) => ({
          ...asset,
          url: resolveCmsAbsoluteMediaUrl(asset.url) || asset.url,
        }))
        .filter((asset) => Boolean(asset.url)),
    };
  }
  return buildCmsBookMediaManifestFromDetail(book);
}

export function resolveManifestAssets(
  manifest: CmsBookMediaManifest | null | undefined
): CmsBookMediaAssetRef[] {
  return manifest?.assets?.filter((asset) => Boolean(asset?.url)) ?? [];
}
