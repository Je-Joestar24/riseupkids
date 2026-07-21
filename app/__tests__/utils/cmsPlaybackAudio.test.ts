jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  },
  InterruptionModeIOS: { DoNotMix: 1 },
  InterruptionModeAndroid: { DoNotMix: 1 },
}));

import {
  resetCmsPlaybackAudioModeForTests,
  shouldShowCmsContentKaraokeLine,
} from '@/utils/cmsPlaybackAudio';

describe('cmsPlaybackAudio', () => {
  afterEach(() => {
    resetCmsPlaybackAudioModeForTests();
  });

  describe('shouldShowCmsContentKaraokeLine', () => {
    it('shows karaoke only when ready with visible timed words', () => {
      expect(shouldShowCmsContentKaraokeLine(true, 5, 3)).toBe(true);
      expect(shouldShowCmsContentKaraokeLine(false, 5, 3)).toBe(false);
      expect(shouldShowCmsContentKaraokeLine(true, 5, 0)).toBe(false);
      expect(shouldShowCmsContentKaraokeLine(true, 0, 0)).toBe(false);
    });
  });
});
