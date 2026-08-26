/**
 * CMS demo/tutorial Next unlock.
 * Demo videos can be unexpectedly long — Next is not gated on watching to the end.
 * The player modal still locks Next until the following (interactive) page media is ready.
 */

import {
  CMS_CONTENT_AUDIO_SAFETY_UNLOCK_MS,
  CMS_CONTENT_AUDIO_STALL_POSITION_SEC,
  CMS_CONTENT_AUDIO_UNLOCK_REMAINING_SEC,
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
 * Video-end gate is intentionally open: kids may skip long demos.
 * Next is still blocked separately until the next page's media is ready.
 */
export function shouldUnlockCmsDemoNextFromVideo(_input: CmsDemoVideoNextUnlockInput): boolean {
  return true;
}
