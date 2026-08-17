import {
  CMS_CONTENT_AUDIO_UNLOCK_REMAINING_SEC,
  resolveCmsContentAudioDurationSec,
  shouldSafetyUnlockCmsContentAudio,
  shouldUnlockCmsContentNextFromAudio,
} from '@/utils/cmsContentAudioNextUnlock';

describe('shouldUnlockCmsContentNextFromAudio', () => {
  it('unlocks when there is no audio', () => {
    expect(
      shouldUnlockCmsContentNextFromAudio({
        hasAudioUrl: false,
        alreadyHeard: false,
        audioFailedOrSkipped: false,
        positionSec: null,
        durationSec: null,
        didJustFinish: false,
      })
    ).toBe(true);
  });

  it('unlocks when already heard in this session', () => {
    expect(
      shouldUnlockCmsContentNextFromAudio({
        hasAudioUrl: true,
        alreadyHeard: true,
        audioFailedOrSkipped: false,
        positionSec: 0,
        durationSec: 10,
        didJustFinish: false,
      })
    ).toBe(true);
  });

  it('unlocks when audio failed or was skipped', () => {
    expect(
      shouldUnlockCmsContentNextFromAudio({
        hasAudioUrl: true,
        alreadyHeard: false,
        audioFailedOrSkipped: true,
        positionSec: null,
        durationSec: null,
        didJustFinish: false,
      })
    ).toBe(true);
  });

  it('stays locked mid-playback on first listen', () => {
    expect(
      shouldUnlockCmsContentNextFromAudio({
        hasAudioUrl: true,
        alreadyHeard: false,
        audioFailedOrSkipped: false,
        positionSec: 2,
        durationSec: 10,
        didJustFinish: false,
      })
    ).toBe(false);
  });

  it('unlocks in the last 0.5 seconds', () => {
    expect(
      shouldUnlockCmsContentNextFromAudio({
        hasAudioUrl: true,
        alreadyHeard: false,
        audioFailedOrSkipped: false,
        positionSec: 9.6,
        durationSec: 10,
        didJustFinish: false,
        unlockRemainingSec: CMS_CONTENT_AUDIO_UNLOCK_REMAINING_SEC,
      })
    ).toBe(true);
  });

  it('unlocks on didJustFinish', () => {
    expect(
      shouldUnlockCmsContentNextFromAudio({
        hasAudioUrl: true,
        alreadyHeard: false,
        audioFailedOrSkipped: false,
        positionSec: 10,
        durationSec: 10,
        didJustFinish: true,
      })
    ).toBe(true);
  });

  it('does not unlock the next page from a previous page didJustFinish', () => {
    expect(
      shouldUnlockCmsContentNextFromAudio({
        pageId: 'content-2',
        playbackPageId: 'content-1',
        hasAudioUrl: true,
        alreadyHeard: false,
        audioFailedOrSkipped: false,
        positionSec: 10,
        durationSec: 10,
        didJustFinish: true,
      })
    ).toBe(false);
  });

  it('stays locked when duration is unknown and not finished', () => {
    expect(
      shouldUnlockCmsContentNextFromAudio({
        hasAudioUrl: true,
        alreadyHeard: false,
        audioFailedOrSkipped: false,
        positionSec: 1,
        durationSec: null,
        didJustFinish: false,
      })
    ).toBe(false);
  });
});

describe('shouldSafetyUnlockCmsContentAudio', () => {
  it('unlocks when playback never started (stall)', () => {
    expect(
      shouldSafetyUnlockCmsContentAudio({
        positionSec: 0,
        playerDurationSec: null,
        didJustFinish: false,
      })
    ).toBe(true);
  });

  it('does not unlock long narrations that are progressing', () => {
    expect(
      shouldSafetyUnlockCmsContentAudio({
        positionSec: 5,
        playerDurationSec: 45,
        didJustFinish: false,
      })
    ).toBe(false);
  });

  it('does not unlock when duration is known even near start', () => {
    expect(
      shouldSafetyUnlockCmsContentAudio({
        positionSec: 0.1,
        playerDurationSec: 30,
        didJustFinish: false,
      })
    ).toBe(false);
  });

  it('does not unlock when position advanced without duration metadata', () => {
    expect(
      shouldSafetyUnlockCmsContentAudio({
        positionSec: 1,
        playerDurationSec: null,
        didJustFinish: false,
      })
    ).toBe(false);
  });
});

describe('resolveCmsContentAudioDurationSec', () => {
  it('prefers player duration', () => {
    expect(
      resolveCmsContentAudioDurationSec({
        playerDurationSec: 8.5,
        wordEndSecHints: [1, 2, 9],
      })
    ).toBe(8.5);
  });

  it('falls back to max word end', () => {
    expect(
      resolveCmsContentAudioDurationSec({
        playerDurationSec: null,
        wordEndSecHints: [1.2, 4.5, 3],
      })
    ).toBe(4.5);
  });

  it('returns null when nothing usable', () => {
    expect(
      resolveCmsContentAudioDurationSec({
        playerDurationSec: 0,
        wordEndSecHints: [],
      })
    ).toBeNull();
  });
});
