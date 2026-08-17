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
  it('locks file videos until the first watch finishes', () => {
    expect(
      shouldUnlockCmsDemoNextFromVideo({
        pageId: 'demo-1',
        playbackPageId: 'demo-1',
        hasVideoUrl: true,
        canDetectEnded: true,
        alreadyPlayed: false,
        videoFailedOrSkipped: false,
        positionSec: 2,
        durationSec: 20,
        didJustFinish: false,
      })
    ).toBe(false);
  });

  it('unlocks after the demo video finishes', () => {
    expect(
      shouldUnlockCmsDemoNextFromVideo({
        pageId: 'demo-1',
        playbackPageId: 'demo-1',
        hasVideoUrl: true,
        canDetectEnded: true,
        alreadyPlayed: false,
        videoFailedOrSkipped: false,
        positionSec: 20,
        durationSec: 20,
        didJustFinish: true,
      })
    ).toBe(true);
  });

  it('unlocks previously played demo pages immediately', () => {
    expect(
      shouldUnlockCmsDemoNextFromVideo({
        pageId: 'demo-1',
        playbackPageId: '',
        hasVideoUrl: true,
        canDetectEnded: true,
        alreadyPlayed: true,
        videoFailedOrSkipped: false,
        positionSec: 0,
        durationSec: 20,
        didJustFinish: false,
      })
    ).toBe(true);
  });

  it('does not trap kids on stream embeds that cannot report ended', () => {
    expect(
      shouldUnlockCmsDemoNextFromVideo({
        pageId: 'demo-1',
        playbackPageId: 'demo-1',
        hasVideoUrl: true,
        canDetectEnded: false,
        alreadyPlayed: false,
        videoFailedOrSkipped: false,
        positionSec: 0,
        durationSec: null,
        didJustFinish: false,
      })
    ).toBe(true);
  });

  it('unlocks when video playback fails', () => {
    expect(
      shouldUnlockCmsDemoNextFromVideo({
        pageId: 'demo-1',
        playbackPageId: 'demo-1',
        hasVideoUrl: true,
        canDetectEnded: true,
        alreadyPlayed: false,
        videoFailedOrSkipped: true,
        positionSec: 0,
        durationSec: null,
        didJustFinish: false,
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
