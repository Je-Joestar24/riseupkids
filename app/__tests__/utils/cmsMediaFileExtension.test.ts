import {
  isIosHostileAudioExtension,
  looksLikeCmsAudioUrl,
  resolveCmsCacheFileExtension,
} from '@/utils/cmsMediaFileExtension';

describe('cmsMediaFileExtension', () => {
  describe('resolveCmsCacheFileExtension', () => {
    it('maps audio .mpeg / .mpg uploads to .mp3 for iOS AVPlayer', () => {
      expect(
        resolveCmsCacheFileExtension(
          'https://cdn.example/media/audio/20260628-004127-13950569.mpeg',
          'audio'
        )
      ).toBe('.mp3');
      expect(
        resolveCmsCacheFileExtension('https://cdn.example/media/audio/clip.mpg', 'audio')
      ).toBe('.mp3');
    });

    it('keeps real audio containers', () => {
      expect(resolveCmsCacheFileExtension('https://cdn.example/a.mp3', 'audio')).toBe('.mp3');
      expect(resolveCmsCacheFileExtension('https://cdn.example/a.m4a', 'audio')).toBe('.m4a');
      expect(resolveCmsCacheFileExtension('https://cdn.example/a.wav', 'audio')).toBe('.wav');
    });

    it('infers .mp3 for extensionless /audio/ URLs', () => {
      expect(resolveCmsCacheFileExtension('https://cdn.example/media/audio/narration', 'audio')).toBe(
        '.mp3'
      );
    });

    it('does not rewrite normal video .mpeg as audio unless kind is audio', () => {
      expect(resolveCmsCacheFileExtension('https://cdn.example/videos/clip.mpeg', 'video')).toBe(
        '.mpeg'
      );
    });
  });

  describe('isIosHostileAudioExtension', () => {
    it('flags .mpeg and .mpg local pack paths', () => {
      expect(
        isIosHostileAudioExtension(
          'file:///var/mobile/.../pages.temp-page-3-3.audio.mpeg'
        )
      ).toBe(true);
      expect(isIosHostileAudioExtension('file:///cache/page.audio.m4a')).toBe(false);
      expect(isIosHostileAudioExtension('file:///cache/page.audio.mp3')).toBe(false);
    });
  });

  describe('looksLikeCmsAudioUrl', () => {
    it('detects /audio/ path and audio kind', () => {
      expect(looksLikeCmsAudioUrl('https://cdn.example/media/audio/x.mpeg')).toBe(true);
      expect(looksLikeCmsAudioUrl('https://cdn.example/other/x.mpeg', 'audio')).toBe(true);
      expect(looksLikeCmsAudioUrl('https://cdn.example/videos/x.mpeg', 'video')).toBe(false);
    });
  });
});
