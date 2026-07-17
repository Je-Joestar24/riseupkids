import { resolvePlayableMediaUri } from '@/components/child/common/cms-player-media';

jest.mock('@/config', () => ({
  BACKEND_ORIGIN: 'https://cdn.riseupkids.test',
}));

describe('resolvePlayableMediaUri — CMS video playback', () => {
  const remote = 'https://cdn.riseupkids.test/uploads/media/videos/demo.mp4';
  const local = 'file:///mock-doc/cms-book-packs/book-1/pages.demo-1.video.mp4';

  it('returns local file URI from pack map (Star Cam parity)', () => {
    expect(resolvePlayableMediaUri(remote, { [remote]: local })).toBe(local);
  });

  it('returns local .mp4 even when remote URL has no extension in map key', () => {
    expect(
      resolvePlayableMediaUri('/uploads/media/videos/demo.mp4', {
        [remote]: local,
      })
    ).toBe(local);
  });

  it('falls back to remote https when pack map has no entry', () => {
    expect(resolvePlayableMediaUri(remote, {})).toBe(remote);
  });
});
