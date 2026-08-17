/**
 * CMS demo/tutorial video Next unlock — first watch must finish.
 * Stream embeds with no ended event, errors, and already-played flags must not trap kids.
 */

import {
  CMS_CONTENT_AUDIO_SAFETY_UNLOCK_MS,
  CMS_CONTENT_AUDIO_STALL_POSITION_SEC,
  CMS_CONTENT_AUDIO_UNLOCK_REMAINING_SEC,
  isCmsPlaybackBoundToPage,
} from '@/utils/cmsContentAudioNextUnlock';

export const CMS_DEMO_VIDEO_UNLOCK_REMAINING_SEC = CMS_CONTENT_AUDIO_UNLOCK_REMAINING_SEC;
export const CMS_DEMO_VIDEO_SAFETY_UNLOCK_MS = CMS_CONTENT_AUDIO_SAFETY_UNLOCK_MS;
export const CMS_DEMO_VIDEO_STALL_POSITION_SEC = CMS_CONTENT_AUDIO_STALL_POSITION_SEC;

export interface CmsDemoVideoNextUnlockInput {
  pageId?: string | null;
  playbackPageId?: string | null;
  hasVideoUrl: boolean;
  /** File/MP4 playback can report ended. Bunny embeds often cannot. */
  canDetectEnded: boolean;
  alreadyPlayed: boolean;
  videoFailedOrSkipped: boolean;
  positionSec: number | null;
  durationSec: number | null;
  didJustFinish: boolean;
  unlockRemainingSec?: number;
}

export function shouldSafetyUnlockCmsDemoVideo(options: {
  positionSec: number;
  playerDurationSec: number | null | undefined;
  didJustFinish: boolean;
}): boolean {
  if (options.didJustFinish) return false;
  const duration = options.playerDurationSec;
  if (typeof duration === 'number' && duration > 0 && Number.isFinite(duration)) {
    return false;
  }
  if (options.positionSec >= CMS_DEMO_VIDEO_STALL_POSITION_SEC) {
    return false;
  }
  return true;
}

/**
 * Whether Next may unlock from the *video* gate alone.
 * Media preload gate is applied separately by the modal.
 */
export function shouldUnlockCmsDemoNextFromVideo(input: CmsDemoVideoNextUnlockInput): boolean {
  if (input.alreadyPlayed) return true;
  if (!input.hasVideoUrl) return true;
  if (input.videoFailedOrSkipped) return true;

  if (!isCmsPlaybackBoundToPage(input.pageId, input.playbackPageId)) {
    return false;
  }

  // Stream-only / Bunny: we cannot observe ended — do not lock forever.
  if (!input.canDetectEnded) return true;

  if (input.didJustFinish) return true;

  const unlockRemaining = input.unlockRemainingSec ?? CMS_DEMO_VIDEO_UNLOCK_REMAINING_SEC;
  const duration = input.durationSec;
  const position = input.positionSec;

  if (
    typeof duration === 'number' &&
    duration > 0 &&
    typeof position === 'number' &&
    Number.isFinite(position)
  ) {
    return duration - position <= unlockRemaining;
  }

  return false;
}
