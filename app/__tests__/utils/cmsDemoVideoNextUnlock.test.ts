import {
  isCmsPlaybackBoundToPage,
  shouldUnlockCmsContentNextFromAudio,
} from '@/utils/cmsContentAudioNextUnlock';
import {
  shouldSafetyUnlockCmsDemoVideo,
  shouldUnlockCmsDemoNextFromVideo,
} from '@/utils/cmsDemoVideoNextUnlock';

describe('isCmsPlaybackBoundToPage', () => {
  it('rejects stale finish events from a previous page', () => {
    expect(isCmsPlaybackBoundToPage('page-b', 'page-a')).toBe(false);
    expect(isCmsPlaybackBoundToPage('page-b', 'page-b')).toBe(true);
    expect(isCmsPlaybackBoundToPage('', 'page-a')).toBe(false);
  });
});

describe('shouldUnlockCmsContentNextFromAudio page binding', () => {
  const base = {
    hasAudioUrl: true,
    alreadyHeard: false,
    audioFailedOrSkipped: false,
    positionSec: 10,
    durationSec: 10,
    didJustFinish: true,
  };

  it('stays locked when didJustFinish belongs to the previous page', () => {
    expect(
      shouldUnlockCmsContentNextFromAudio({
        ...base,
        pageId: 'content-2',
        playbackPageId: 'content-1',
      })
    ).toBe(false);
  });

  it('unlocks when the finished event is for the current page', () => {
    expect(
      shouldUnlockCmsContentNextFromAudio({
        ...base,
        pageId: 'content-2',
        playbackPageId: 'content-2',
      })
    ).toBe(true);
  });

  it('still unlocks already-heard pages even before playback rebinds', () => {
    expect(
      shouldUnlockCmsContentNextFromAudio({
        ...base,
        pageId: 'content-2',
        playbackPageId: '',
        alreadyHeard: true,
        didJustFinish: false,
        positionSec: 0,
      })
    ).toBe(true);
  });
});

describe('shouldUnlockCmsDemoNextFromVideo', () => {
  const midWatch = {
    pageId: 'demo-1',
    playbackPageId: 'demo-1',
    hasVideoUrl: true,
    canDetectEnded: true,
    alreadyPlayed: false,
    videoFailedOrSkipped: false,
    positionSec: 2,
    durationSec: 20,
    didJustFinish: false,
  };

  it('does not wait for long demo videos to finish before Next', () => {
    expect(shouldUnlockCmsDemoNextFromVideo(midWatch)).toBe(true);
    expect(
      shouldUnlockCmsDemoNextFromVideo({
        ...midWatch,
        didJustFinish: true,
        positionSec: 20,
      })
    ).toBe(true);
  });

  it('still unlocks stream embeds and failed playback', () => {
    expect(
      shouldUnlockCmsDemoNextFromVideo({
        ...midWatch,
        canDetectEnded: false,
        durationSec: null,
      })
    ).toBe(true);
    expect(
      shouldUnlockCmsDemoNextFromVideo({
        ...midWatch,
        videoFailedOrSkipped: true,
      })
    ).toBe(true);
  });
});

describe('shouldSafetyUnlockCmsDemoVideo', () => {
  it('unlocks only when playback never started', () => {
    expect(
      shouldSafetyUnlockCmsDemoVideo({
        positionSec: 0,
        playerDurationSec: null,
        didJustFinish: false,
      })
    ).toBe(true);
    expect(
      shouldSafetyUnlockCmsDemoVideo({
        positionSec: 3,
        playerDurationSec: 18,
        didJustFinish: false,
      })
    ).toBe(false);
  });
});
