/**
 * CMS content-page Next unlock rules for reading audio.
 * Lock only on first listen; never trap kids when audio is missing/broken.
 */

/** Unlock Next this many seconds before audio ends (feels snappy). */
export const CMS_CONTENT_AUDIO_UNLOCK_REMAINING_SEC = 0.5;

/** If audio never reports progress/duration, unlock so Next cannot stick forever. */
export const CMS_CONTENT_AUDIO_SAFETY_UNLOCK_MS = 12_000;

export interface CmsContentAudioNextUnlockInput {
  /** Remote/local URI present for this page. */
  hasAudioUrl: boolean;
  /** Child already finished (or was cleared past) this page’s audio in this book session. */
  alreadyHeard: boolean;
  /** Load/play failed, or we intentionally skipped audio. */
  audioFailedOrSkipped: boolean;
  /** Current playback position in seconds. */
  positionSec: number | null;
  /** Known duration in seconds (from player or word timings). */
  durationSec: number | null;
  didJustFinish: boolean;
  unlockRemainingSec?: number;
}

/**
 * Whether Next may unlock from the *audio* gate alone.
 * Media preload gate is applied separately by the modal.
 */
export function shouldUnlockCmsContentNextFromAudio(
  input: CmsContentAudioNextUnlockInput
): boolean {
  if (input.alreadyHeard) return true;
  if (!input.hasAudioUrl) return true;
  if (input.audioFailedOrSkipped) return true;
  if (input.didJustFinish) return true;

  const unlockRemaining = input.unlockRemainingSec ?? CMS_CONTENT_AUDIO_UNLOCK_REMAINING_SEC;
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

/** Prefer player duration; fall back to last karaoke word end when available. */
export function resolveCmsContentAudioDurationSec(options: {
  playerDurationSec: number | null | undefined;
  wordEndSecHints?: number[];
}): number | null {
  const fromPlayer = options.playerDurationSec;
  if (typeof fromPlayer === 'number' && fromPlayer > 0 && Number.isFinite(fromPlayer)) {
    return fromPlayer;
  }
  const hints = options.wordEndSecHints || [];
  let max = 0;
  hints.forEach((end) => {
    if (typeof end === 'number' && Number.isFinite(end) && end > max) max = end;
  });
  return max > 0 ? max : null;
}
