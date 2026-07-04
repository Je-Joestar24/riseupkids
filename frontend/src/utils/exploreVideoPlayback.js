import { BACKEND_BASE_URL } from '../config/constants';
import { looksLikeBunnyExploreEmbedUrl } from './bunnyExploreEmbed';

/**
 * Resolve how an explore content item should be played on web.
 * Upload → HTML5 video; Bunny embed → iframe.
 */

/**
 * @param {object|null|undefined} item
 * @returns {boolean}
 */
export function isExploreBunnyEmbed(item) {
  if (!item) return false;
  const file = item.videoFile;
  if (file?.videoSource === 'embed') return true;
  const raw = item.videoFileUrl ?? file?.embedUrl ?? file?.url;
  return looksLikeBunnyExploreEmbedUrl(raw);
}

/**
 * @param {string|null|undefined} path
 * @returns {string|null}
 */
export function defaultBuildExploreMediaUrl(path) {
  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BACKEND_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * @param {object|null|undefined} item
 * @param {(path: string|null|undefined) => string|null} [buildMediaUrl]
 * @returns {{ mode: 'embed' | 'file', url: string|null }}
 */
export function resolveExploreVideoPlayback(item, buildMediaUrl = defaultBuildExploreMediaUrl) {
  if (!item) return { mode: 'file', url: null };

  const file = item.videoFile;
  const resolve = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return buildMediaUrl ? buildMediaUrl(raw) ?? raw : raw;
  };

  if (file?.videoSource === 'embed') {
    const embedRaw = file.embedUrl ?? file.url ?? item.videoFileUrl;
    return { mode: 'embed', url: resolve(embedRaw) };
  }

  if (file?.videoSource === 'upload') {
    const fileRaw = file.url ?? item.videoFileUrl;
    return { mode: 'file', url: resolve(fileRaw) };
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

/**
 * Build the video payload passed into VideoPlayerModal from explore content.
 * @param {object|null|undefined} exploreVideo
 * @param {(path: string|null|undefined) => string|null} [buildMediaUrl]
 */
export function buildExploreVideoForPlayer(exploreVideo, buildMediaUrl = defaultBuildExploreMediaUrl) {
  if (!exploreVideo) return null;

  const videoFile = exploreVideo.videoFile;
  const playback = resolveExploreVideoPlayback(exploreVideo, buildMediaUrl);

  return {
    _id: videoFile?._id || exploreVideo._id,
    title: exploreVideo.title,
    url: playback.url,
    videoSource: videoFile?.videoSource,
    embedUrl: videoFile?.embedUrl,
    description: exploreVideo.description,
    duration: exploreVideo.duration,
    scormFile: videoFile?.scormFile,
    scormFileUrl: videoFile?.scormFileUrl,
    scormFilePath: videoFile?.scormFilePath,
    completionContentType: videoFile?.completionContentType,
    html5PackageId: videoFile?.html5PackageId,
    html5EntryPoint: videoFile?.html5EntryPoint,
    cmsBookId: videoFile?.cmsBookId,
  };
}
