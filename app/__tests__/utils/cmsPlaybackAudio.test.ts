jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  },
  InterruptionModeIOS: { DoNotMix: 1 },
  InterruptionModeAndroid: { DoNotMix: 1 },
}));

import { Audio } from 'expo-av';

import {
  ensureCmsPlaybackAudioMode,
  resetCmsPlaybackAudioModeForTests,
  shouldShowCmsContentKaraokeLine,
} from '@/utils/cmsPlaybackAudio';

describe('cmsPlaybackAudio', () => {
  afterEach(() => {
    resetCmsPlaybackAudioModeForTests();
    jest.clearAllMocks();
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
});
