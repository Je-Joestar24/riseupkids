import {
  isModuleBunnyEmbed,
  resolveModuleVideoPlayback,
} from './moduleVideoPlayback';

/**
 * Instruction video playback for audio assignments and chants.
 * Upload → HTML5 video; Bunny Stream embed → iframe.
 */

/**
 * @param {unknown} media
 * @returns {object|null}
 */
export function coerceInstructionVideoMedia(media) {
  if (!media) return null;
  if (typeof media === 'string') {
    const trimmed = media.trim();
    if (!trimmed || /^[a-f0-9]{24}$/i.test(trimmed)) return null;
    return { url: trimmed };
  }
  if (typeof media === 'object') {
    const m = media;
    if (m.url || m.embedUrl || m.cloudUrl || m.filePath || m.videoSource) {
      return {
        url: typeof m.url === 'string' ? m.url : null,
        embedUrl: typeof m.embedUrl === 'string' ? m.embedUrl : null,
        cloudUrl: typeof m.cloudUrl === 'string' ? m.cloudUrl : null,
        filePath: typeof m.filePath === 'string' ? m.filePath : null,
        videoSource:
          m.videoSource === 'embed' || m.videoSource === 'upload'
            ? m.videoSource
            : undefined,
      };
    }
  }
  return null;
}

/**
 * @param {unknown} media
 * @param {(path: string|null|undefined) => string|null} [buildMediaUrl]
 * @returns {import('./moduleVideoPlayback').ModuleVideoPlayback}
 */
export function resolveInstructionVideoPlayback(media, buildMediaUrl) {
  const normalized = coerceInstructionVideoMedia(media);
  return resolveModuleVideoPlayback(normalized, buildMediaUrl);
}

/**
 * @param {unknown} media
 * @returns {boolean}
 */
export function isInstructionVideoBunnyEmbed(media) {
  const normalized = coerceInstructionVideoMedia(media);
  return isModuleBunnyEmbed(normalized);
}
