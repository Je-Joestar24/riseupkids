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
  clearPrimedCmsContentAudio,
  getPrimedCmsContentAudioCount,
  primeCmsContentAudio,
  resetCmsContentAudioPrimeForTests,
  shouldPrimeCmsContentAudio,
  takePrimedCmsContentAudio,
} from '@/services/cmsContentAudioPrime';

function mockLoadedSound() {
  return {
    getStatusAsync: jest.fn().mockResolvedValue({ isLoaded: true, isPlaying: false }),
    setPositionAsync: jest.fn().mockResolvedValue(undefined),
    setOnPlaybackStatusUpdate: jest.fn(),
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    playAsync: jest.fn().mockResolvedValue(undefined),
  };
}

describe('cmsContentAudioPrime', () => {
  afterEach(() => {
    resetCmsContentAudioPrimeForTests();
    jest.clearAllMocks();
  });

  it('primes a short content MP3 into a paused Sound', async () => {
    const sound = mockLoadedSound();
    (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({ sound });

    const ok = await primeCmsContentAudio('file:///cache/short-narration.mp3');
    expect(ok).toBe(true);
    expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
      { uri: 'file:///cache/short-narration.mp3' },
      expect.objectContaining({ shouldPlay: false, positionMillis: 0 })
    );
    expect(getPrimedCmsContentAudioCount()).toBe(1);
  });

  it('hands the primed Sound to the content page on take', async () => {
    const sound = mockLoadedSound();
    (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({ sound });

    await primeCmsContentAudio('file:///cache/page-2.mp3');
    const taken = await takePrimedCmsContentAudio('file:///cache/page-2.mp3');

    expect(taken).toBe(sound);
    expect(sound.setPositionAsync).toHaveBeenCalledWith(0);
    expect(getPrimedCmsContentAudioCount()).toBe(0);
    expect(await takePrimedCmsContentAudio('file:///cache/page-2.mp3')).toBeNull();
  });

  it('clears primed Sounds when the player closes', async () => {
    const sound = mockLoadedSound();
    (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({ sound });

    await primeCmsContentAudio('file:///cache/a.mp3');
    await clearPrimedCmsContentAudio();

    expect(sound.unloadAsync).toHaveBeenCalled();
    expect(getPrimedCmsContentAudioCount()).toBe(0);
  });

  it('does not re-create when the same URI is already primed', async () => {
    const sound = mockLoadedSound();
    (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({ sound });

    await primeCmsContentAudio('file:///cache/same.mp3');
    await primeCmsContentAudio('file:///cache/same.mp3');

    expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(1);
  });

  it('does not prime during intro (protects intro BGM on iOS)', () => {
    expect(shouldPrimeCmsContentAudio('intro')).toBe(false);
    expect(shouldPrimeCmsContentAudio('content')).toBe(true);
    expect(shouldPrimeCmsContentAudio('demo')).toBe(true);
  });

  it('allows take via remote alias when primed from local file URI', async () => {
    const sound = mockLoadedSound();
    (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({ sound });

    await primeCmsContentAudio('file:///cache/page.mp3', ['https://cdn.example/page.mp3']);
    const taken = await takePrimedCmsContentAudio('https://cdn.example/page.mp3');

    expect(taken).toBe(sound);
    expect(getPrimedCmsContentAudioCount()).toBe(0);
  });
});
