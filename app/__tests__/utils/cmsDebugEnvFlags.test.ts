import { isCmsAudioDebugEnvEnabled } from '@/components/child/common/cms-content-audio-debug';
import { isCmsVideoDebugEnvEnabled } from '@/components/child/common/cms-video-playback-debug';

describe('CMS debug env flags', () => {
  it.each([
    [undefined, false],
    ['', false],
    ['false', false],
    ['FALSE', false],
    ['0', false],
    ['no', false],
    ['true', true],
    ['TRUE', true],
    [' true ', true],
  ] as const)('audio debug raw %j → %s', (raw, expected) => {
    expect(isCmsAudioDebugEnvEnabled(raw)).toBe(expected);
  });

  it.each([
    [undefined, false],
    ['', false],
    ['false', false],
    ['true', true],
  ] as const)('video debug raw %j → %s', (raw, expected) => {
    expect(isCmsVideoDebugEnvEnabled(raw)).toBe(expected);
  });
});
