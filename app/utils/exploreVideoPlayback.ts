/**
 * Resolve how an explore content item should be played in the child app.
 * Upload → expo-av file URL; Bunny embed → WebView iframe page URL.
 */

import type { ExploreContentItem } from '@/services/exploreService';
import { looksLikeBunnyExploreEmbedUrl } from '@/utils/bunnyExploreEmbed';

export type ExploreVideoPlaybackMode = 'embed' | 'file';

export interface ExploreVideoPlayback {
  mode: ExploreVideoPlaybackMode;
  /** Playable URL: Bunny iframe page (embed) or direct file URL (upload). */
  url: string | null;
}

/**
 * True when explore row should use Bunny iframe embed playback (not expo-av).
 */
export function isExploreBunnyEmbed(item: ExploreContentItem | null | undefined): boolean {
  if (!item) return false;
  const file = item.videoFile;
  if (file?.videoSource === 'embed') return true;
  const raw = item.videoFileUrl ?? file?.embedUrl ?? file?.url;
  return looksLikeBunnyExploreEmbedUrl(raw);
}

/**
 * Resolve playback mode and URL from an explore content item.
 * @param item Explore content (may include populated videoFile)
 * @param buildMediaUrl Optional resolver for relative upload paths
 */
export function resolveExploreVideoPlayback(
  item: ExploreContentItem | null | undefined,
  buildMediaUrl?: (path: string | null | undefined) => string | null
): ExploreVideoPlayback {
  if (!item) return { mode: 'file', url: null };

  const file = item.videoFile;
  const resolve = (raw: string | null | undefined): string | null => {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return buildMediaUrl ? buildMediaUrl(raw) ?? raw : raw;
  };

  if (file?.videoSource === 'embed') {
    const embedRaw = file.embedUrl ?? file.url ?? item.videoFileUrl;
    const url = resolve(embedRaw);
    return { mode: 'embed', url };
  }

  const candidates = [item.videoFileUrl, file?.embedUrl, file?.url];
  for (const raw of candidates) {
    if (!raw) continue;
    if (looksLikeBunnyExploreEmbedUrl(raw)) {
      return { mode: 'embed', url: resolve(raw) };
    }
  }

  const fileRaw = file?.url ?? item.videoFileUrl;
  return { mode: 'file', url: resolve(fileRaw) };
}
