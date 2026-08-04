jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  },
  InterruptionModeIOS: { DoNotMix: 1 },
  InterruptionModeAndroid: { DoNotMix: 1 },
}));

import { Audio } from 'expo-av';

import { Platform } from 'react-native';

import {
  CMS_CONTENT_AUDIO_IOS_SETTLE_MS,
  CMS_CONTENT_AUDIO_PLAY_WATCHDOG_MS,
  ensureCmsPlaybackAudioMode,
  getCmsContentAudioSettleMs,
  playCmsSoundWithIosWatchdog,
  prepareCmsContentAudioPlayback,
  resetCmsPlaybackAudioModeForTests,
  shouldShowCmsContentKaraokeLine,
} from '@/utils/cmsPlaybackAudio';

describe('cmsPlaybackAudio', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    resetCmsPlaybackAudioModeForTests();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalOs });
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('shouldShowCmsContentKaraokeLine', () => {
    it('shows karaoke only when ready with visible timed words', () => {
      expect(shouldShowCmsContentKaraokeLine(true, 5, 3)).toBe(true);
      expect(shouldShowCmsContentKaraokeLine(false, 5, 3)).toBe(false);
      expect(shouldShowCmsContentKaraokeLine(true, 5, 0)).toBe(false);
      expect(shouldShowCmsContentKaraokeLine(true, 0, 0)).toBe(false);
    });
  });

  describe('ensureCmsPlaybackAudioMode', () => {
    it('enables silent-mode playback for iOS CMS books', async () => {
      await ensureCmsPlaybackAudioMode();
      expect(Audio.setAudioModeAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
        })
      );
    });
  });

  describe('content audio iOS settle + watchdog', () => {
    it('settles only on iOS before arming the audio session', () => {
      expect(getCmsContentAudioSettleMs('ios')).toBe(CMS_CONTENT_AUDIO_IOS_SETTLE_MS);
      expect(getCmsContentAudioSettleMs('android')).toBe(0);
    });

    it('prepares content audio with iOS settle then setAudioMode', async () => {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      jest.useFakeTimers();

      const prep = prepareCmsContentAudioPlayback();
      await jest.advanceTimersByTimeAsync(CMS_CONTENT_AUDIO_IOS_SETTLE_MS);
      await prep;

      expect(Audio.setAudioModeAsync).toHaveBeenCalled();
    });

    it('retries playAsync on iOS when loaded but not playing', async () => {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      jest.useFakeTimers();

      const sound = {
        playAsync: jest.fn().mockResolvedValue(undefined),
        getStatusAsync: jest
          .fn()
          .mockResolvedValue({
            isLoaded: true,
            isPlaying: false,
            didJustFinish: false,
            positionMillis: 0,
          }),
      };

      const playPromise = playCmsSoundWithIosWatchdog(sound);
      await Promise.resolve();
      expect(sound.playAsync).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(CMS_CONTENT_AUDIO_PLAY_WATCHDOG_MS);
      await playPromise;

      expect(sound.playAsync).toHaveBeenCalledTimes(2);
      expect(Audio.setAudioModeAsync).toHaveBeenCalled();
    });

    it('does not restart short clips that already progressed', async () => {
      Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
      jest.useFakeTimers();

      const sound = {
        playAsync: jest.fn().mockResolvedValue(undefined),
        getStatusAsync: jest.fn().mockResolvedValue({
          isLoaded: true,
          isPlaying: false,
          didJustFinish: false,
          positionMillis: 400,
        }),
      };

      const playPromise = playCmsSoundWithIosWatchdog(sound);
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(CMS_CONTENT_AUDIO_PLAY_WATCHDOG_MS);
      await playPromise;

      expect(sound.playAsync).toHaveBeenCalledTimes(1);
    });
  });
});
