/**
 * Resolve how a module (step) course video should be played in the child app.
 * Upload → expo-av file URL; Bunny embed → WebView direct URI.
 */

import type { PopulatedContentItem } from '@/services/moduleService';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

export type ModuleVideoPlaybackMode = 'embed' | 'file';

export interface ModuleVideoPlayback {
  mode: ModuleVideoPlaybackMode;
  /** Bunny embed page URL (embed) or direct file URL (upload). */
  url: string | null;
}

type ModuleVideoLike = Pick<
  PopulatedContentItem,
  'url' | 'embedUrl' | 'cloudUrl' | 'videoSource' | 'filePath'
> & {
  url?: string;
  filePath?: string;
  embedUrl?: string;
  cloudUrl?: string;
  videoSource?: 'upload' | 'embed';
};

/** True when step/module video should use Bunny WebView playback (not expo-av). */
export function isModuleBunnyEmbed(
  item: ModuleVideoLike | PopulatedContentItem | null | undefined
): boolean {
  if (!item) return false;
  if (item.videoSource === 'embed') return true;
  const raw = item.embedUrl ?? item.url ?? item.cloudUrl;
  return looksLikeBunnyExploreEmbedUrl(raw);
}

/**
 * Resolve playback mode and URL from a populated module video item.
 */
export function resolveModuleVideoPlayback(
  item: ModuleVideoLike | PopulatedContentItem | null | undefined,
  buildMediaUrl?: (path: string | null | undefined) => string | null
): ModuleVideoPlayback {
  if (!item) return { mode: 'file', url: null };

  const resolve = (raw: string | null | undefined): string | null => {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return buildMediaUrl ? buildMediaUrl(raw) ?? raw : raw;
  };

  if (item.videoSource === 'embed') {
    const embedRaw = item.embedUrl ?? item.url ?? item.cloudUrl;
    return { mode: 'embed', url: resolve(embedRaw) };
  }

  const embedCandidates = [item.embedUrl, item.url, item.cloudUrl];
  for (const raw of embedCandidates) {
    if (!raw) continue;
    if (looksLikeBunnyExploreEmbedUrl(raw)) {
      return { mode: 'embed', url: resolve(raw) };
    }
  }

  const fileRaw = item.url ?? item.filePath ?? item.cloudUrl;
  return { mode: 'file', url: resolve(fileRaw) };
}
