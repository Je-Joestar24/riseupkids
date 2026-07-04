import { looksLikeBunnyExploreEmbedUrl } from './bunnyExploreEmbed';

/**
 * Resolve how a module (journey step) video should be played on web.
 * Upload → HTML5 video; Bunny embed → iframe.
 */

/** @typedef {'embed' | 'file'} ModuleVideoPlaybackMode */

/**
 * @typedef {Object} ModuleVideoPlayback
 * @property {ModuleVideoPlaybackMode} mode
 * @property {string|null} url Bunny embed page URL (embed) or direct file URL (upload)
 */

/**
 * @param {object|null|undefined} item
 * @returns {boolean}
 */
export function isModuleBunnyEmbed(item) {
  if (!item) return false;
  if (item.videoSource === 'embed') return true;
  const raw = item.embedUrl ?? item.url ?? item.cloudUrl;
  return looksLikeBunnyExploreEmbedUrl(raw);
}

/**
 * @param {object|null|undefined} item
 * @param {(path: string|null|undefined) => string|null} [buildMediaUrl]
 * @returns {ModuleVideoPlayback}
 */
export function resolveModuleVideoPlayback(item, buildMediaUrl) {
  if (!item) return { mode: 'file', url: null };

  const resolve = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return buildMediaUrl ? buildMediaUrl(raw) ?? raw : raw;
  };

  if (item.videoSource === 'embed') {
    const embedRaw = item.embedUrl ?? item.url ?? item.cloudUrl;
    return { mode: 'embed', url: resolve(embedRaw) };
  }

  if (item.videoSource === 'upload') {
    const fileRaw = item.url ?? item.filePath ?? item.cloudUrl;
    return { mode: 'file', url: resolve(fileRaw) };
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
