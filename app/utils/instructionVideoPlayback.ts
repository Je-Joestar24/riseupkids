/**
 * Instruction video playback for audio assignments and chants.
 * Upload → expo-av; Bunny Stream embed → WebView (same as module / explore videos).
 */

import type { ModuleVideoPlayback } from '@/utils/moduleVideoPlayback';
import {
  isModuleBunnyEmbed,
  resolveModuleVideoPlayback,
} from '@/utils/moduleVideoPlayback';

export type InstructionVideoMediaLike = {
  url?: string | null;
  embedUrl?: string | null;
  cloudUrl?: string | null;
  filePath?: string | null;
  videoSource?: 'upload' | 'embed';
};

/** Normalize populated instructionVideo (object, id string, or nested progress payload). */
export function coerceInstructionVideoMedia(
  media: unknown
): InstructionVideoMediaLike | null {
  if (!media) return null;
  if (typeof media === 'string') {
    const trimmed = media.trim();
    if (!trimmed || /^[a-f0-9]{24}$/i.test(trimmed)) return null;
    return { url: trimmed };
  }
  if (typeof media === 'object') {
    const m = media as InstructionVideoMediaLike & Record<string, unknown>;
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

export function resolveInstructionVideoPlayback(
  media: unknown,
  buildMediaUrl?: (path: string | null | undefined) => string | null
): ModuleVideoPlayback {
  const normalized = coerceInstructionVideoMedia(media);
  return resolveModuleVideoPlayback(normalized, buildMediaUrl);
}

export function isInstructionVideoBunnyEmbed(media: unknown): boolean {
  const normalized = coerceInstructionVideoMedia(media);
  return isModuleBunnyEmbed(normalized);
}
