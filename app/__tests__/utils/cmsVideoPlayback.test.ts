import { isHardwareDecoderPlaybackFailure } from '@/utils/cmsVideoPlayback';

describe('isHardwareDecoderPlaybackFailure', () => {
  it('detects Android MediaCodec decoder init failures', () => {
    const error =
      'P7.o$b: Decoder init failed: c2.qti.avc.decoder, Format(1, null, null, video/avc, avc1.640033, -1, null, [3840, 2160, 30.0], [-1, -1])';
    expect(isHardwareDecoderPlaybackFailure(error)).toBe(true);
  });

  it('ignores generic network errors', () => {
    expect(isHardwareDecoderPlaybackFailure('Network request failed')).toBe(false);
    expect(isHardwareDecoderPlaybackFailure(null)).toBe(false);
  });
});
