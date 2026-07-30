/**
 * CMS intro background music — unit + iOS TestFlight e2e contracts.
 * Native expo-av is mocked; these tests lock the recovery / gate behaviour that
 * was failing on TestFlight while Android worked.
 */

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: jest.fn(),
    },
  },
  InterruptionModeIOS: { DoNotMix: 1 },
  InterruptionModeAndroid: { DoNotMix: 1 },
}));

import { Audio } from 'expo-av';

import {
  resetCmsIntroBackgroundMusicForTests,
  startCmsIntroBackgroundMusic,
  stopCmsIntroBackgroundMusic,
} from '@/services/cmsIntroBackgroundMusic';
import {
  CMS_INTRO_BGM_IOS_SETTLE_MS,
  CMS_INTRO_BGM_PLAY_WATCHDOG_MS,
  getCmsIntroBackgroundMusicSettleMs,
  getCmsPlaybackAudioSessionEpoch,
  prepareCmsPlaybackAudioAfterOrientation,
  resetCmsPlaybackAudioModeForTests,
  resolveCmsIntroBackgroundMusicStatusAction,
  shouldStartCmsIntroBackgroundMusic,
} from '@/utils/cmsPlaybackAudio';

describe('shouldStartCmsIntroBackgroundMusic', () => {
  it('starts only when URL exists and preload is done', () => {
    expect(
      shouldStartCmsIntroBackgroundMusic({
        backgroundMusicUrl: 'https://cdn.example/intro.mp3',
        isPreloading: false,
      })
    ).toBe(true);
    expect(
      shouldStartCmsIntroBackgroundMusic({
        backgroundMusicUrl: 'file:///var/cms/intro.mp3',
        isPreloading: true,
      })
    ).toBe(false);
    expect(
      shouldStartCmsIntroBackgroundMusic({
        backgroundMusicUrl: '',
        isPreloading: false,
      })
    ).toBe(false);
  });
});

describe('resolveCmsIntroBackgroundMusicStatusAction', () => {
  it('replays when the track finishes (iOS loop fallback)', () => {
    expect(
      resolveCmsIntroBackgroundMusicStatusAction({
        isLoaded: true,
        isPlaying: false,
        didJustFinish: true,
      })
    ).toBe('replay');
  });

  it('retries audio session when watchdog finds silent loaded sound', () => {
    expect(
      resolveCmsIntroBackgroundMusicStatusAction({
        isLoaded: true,
        isPlaying: false,
        watchdogNotPlaying: true,
      })
    ).toBe('retry_session');
  });

  it('plays when loaded but not playing', () => {
    expect(
      resolveCmsIntroBackgroundMusicStatusAction({
        isLoaded: true,
        isPlaying: false,
      })
    ).toBe('noop');
  });

  it('noops when already playing', () => {
    expect(
      resolveCmsIntroBackgroundMusicStatusAction({
        isLoaded: true,
        isPlaying: true,
      })
    ).toBe('noop');
  });
});

describe('iOS settle timing', () => {
  it('settles on iOS only so landscape lock can finish before BGM', () => {
    expect(getCmsIntroBackgroundMusicSettleMs('ios')).toBe(CMS_INTRO_BGM_IOS_SETTLE_MS);
    expect(getCmsIntroBackgroundMusicSettleMs('android')).toBe(0);
    expect(CMS_INTRO_BGM_PLAY_WATCHDOG_MS).toBeGreaterThan(0);
  });
});

describe('prepareCmsPlaybackAudioAfterOrientation', () => {
  beforeEach(() => {
    resetCmsPlaybackAudioModeForTests();
    jest.clearAllMocks();
  });

  it('re-applies audio mode and bumps epoch for intro re-arm', async () => {
    const before = getCmsPlaybackAudioSessionEpoch();
    const epoch = await prepareCmsPlaybackAudioAfterOrientation();
    expect(epoch).toBe(before + 1);
    expect(Audio.setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
      })
    );
  });
});

describe('startCmsIntroBackgroundMusic e2e (mocked expo-av)', () => {
  const playAsync = jest.fn().mockResolvedValue(undefined);
  const setPositionAsync = jest.fn().mockResolvedValue(undefined);
  const stopAsync = jest.fn().mockResolvedValue(undefined);
  const unloadAsync = jest.fn().mockResolvedValue(undefined);
  const setOnPlaybackStatusUpdate = jest.fn();
  const getStatusAsync = jest.fn();

  function mockSound(statusOverrides: Record<string, unknown> = {}) {
    getStatusAsync.mockResolvedValue({
      isLoaded: true,
      isPlaying: false,
      didJustFinish: false,
      ...statusOverrides,
    });
    return {
      playAsync,
      setPositionAsync,
      stopAsync,
      unloadAsync,
      setOnPlaybackStatusUpdate,
      getStatusAsync,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    resetCmsIntroBackgroundMusicForTests();
    resetCmsPlaybackAudioModeForTests();
    jest.clearAllMocks();
    (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({
      sound: mockSound(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads without shouldPlay, then playAsync, then watchdog retries when silent', async () => {
    const uri = 'file:///mock-doc/cms-book-packs/book/intro.mp3';
    const startPromise = startCmsIntroBackgroundMusic(uri);

    // Flush settle (0 on jest default platform unless we mock Platform — android typically)
    await jest.runAllTimersAsync();
    await startPromise;

    expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
      { uri },
      expect.objectContaining({
        shouldPlay: false,
        isLooping: true,
        volume: 1,
      })
    );
    expect(playAsync).toHaveBeenCalled();
    // Watchdog saw !isPlaying → ensure mode + play again
    expect(Audio.setAudioModeAsync).toHaveBeenCalled();
    expect(playAsync.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('stops and unloads on stopCmsIntroBackgroundMusic', async () => {
    (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({
      sound: mockSound({ isPlaying: true }),
    });
    const startPromise = startCmsIntroBackgroundMusic('https://cdn.example/a.mp3');
    await jest.runAllTimersAsync();
    await startPromise;

    await stopCmsIntroBackgroundMusic();
    expect(stopAsync).toHaveBeenCalled();
    expect(unloadAsync).toHaveBeenCalled();
  });

  it('status handler replays on didJustFinish for loop reliability', async () => {
    let statusCb: ((s: unknown) => void) | null = null;
    setOnPlaybackStatusUpdate.mockImplementation((cb: (s: unknown) => void) => {
      statusCb = cb;
    });
    (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({
      sound: mockSound({ isPlaying: true }),
    });

    const startPromise = startCmsIntroBackgroundMusic('https://cdn.example/loop.mp3');
    await jest.runAllTimersAsync();
    await startPromise;

    expect(statusCb).toBeTruthy();
    statusCb?.({
      isLoaded: true,
      isPlaying: false,
      didJustFinish: true,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(setPositionAsync).toHaveBeenCalledWith(0);
    expect(playAsync.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
