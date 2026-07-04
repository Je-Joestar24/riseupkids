import { resolveModuleVideoPlayback } from './moduleVideoPlayback';
import { resolveExploreVideoPlayback } from './exploreVideoPlayback';

/**
 * Unified playback resolution for child VideoPlayerModal.
 * Supports journey/module videos and explore content (upload or Bunny embed).
 *
 * @param {object|null|undefined} video - Flattened video payload passed to the modal
 * @param {object} [options]
 * @param {boolean} [options.isExploreVideo]
 * @param {object|null} [options.exploreContent] - Full explore row (preferred when available)
 * @param {(path: string|null|undefined) => string|null} [options.buildMediaUrl]
 * @returns {{ mode: 'embed' | 'file', url: string|null }}
 */
export function resolveChildVideoPlayback(
  video,
  { isExploreVideo = false, exploreContent = null, buildMediaUrl } = {}
) {
  if (isExploreVideo) {
    if (exploreContent) {
      return resolveExploreVideoPlayback(exploreContent, buildMediaUrl);
    }
    if (video) {
      return resolveExploreVideoPlayback(
        {
          videoFile: {
            url: video.url,
            embedUrl: video.embedUrl,
            videoSource: video.videoSource,
          },
          videoFileUrl: video.url,
        },
        buildMediaUrl
      );
    }
    return { mode: 'file', url: null };
  }

  return resolveModuleVideoPlayback(video, buildMediaUrl);
}

export function isChildVideoBunnyEmbed(video, options = {}) {
  return resolveChildVideoPlayback(video, options).mode === 'embed';
}
