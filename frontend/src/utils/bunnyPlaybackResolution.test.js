/**
 * Which videos play as a Bunny embed. Both Bunny hosts count (as in the phone app); anything else that is not
 * marked as an embed stays a file.
 */
import { describe, it, expect } from 'vitest';
import { resolveModuleVideoPlayback, isModuleBunnyEmbed } from './moduleVideoPlayback';
import { resolveExploreVideoPlayback, isExploreBunnyEmbed } from './exploreVideoPlayback';
import { resolveChildVideoPlayback } from './childVideoPlayback';

const IFRAME = 'https://iframe.mediadelivery.net/embed/1/abc';
const PLAYER = 'https://player.mediadelivery.net/embed/1/abc';
const FILE = 'https://cdn.example.com/movie.mp4';

describe.each([
  ['the iframe host', IFRAME],
  ['the newer player host', PLAYER],
])('a course video whose address is on %s', (_name, url) => {
  it('is played as an embed, whichever field holds the address', () => {
    expect(resolveModuleVideoPlayback({ embedUrl: url })).toEqual({ mode: 'embed', url });
    expect(resolveModuleVideoPlayback({ url })).toEqual({ mode: 'embed', url });
    expect(resolveModuleVideoPlayback({ cloudUrl: url })).toEqual({ mode: 'embed', url });
    expect(isModuleBunnyEmbed({ url })).toBe(true);
  });

  it('is an embed for Explore, whichever field holds the address', () => {
    expect(resolveExploreVideoPlayback({ videoFileUrl: url })).toEqual({ mode: 'embed', url });
    expect(resolveExploreVideoPlayback({ videoFile: { embedUrl: url } })).toEqual({ mode: 'embed', url });
    expect(resolveExploreVideoPlayback({ videoFile: { url } })).toEqual({ mode: 'embed', url });
    expect(isExploreBunnyEmbed({ videoFileUrl: url })).toBe(true);
  });

  it('is an embed for the child player (a course video and an Explore video)', () => {
    expect(resolveChildVideoPlayback({ url })).toEqual({ mode: 'embed', url });
    expect(resolveChildVideoPlayback({ url }, { isExploreVideo: true })).toEqual({ mode: 'embed', url });
  });
});

describe('a video that is not a Bunny embed', () => {
  it.each([
    ['an uploaded file', { url: FILE }],
    ['an address on another site', { url: 'https://example.com/embed/1/abc' }],
    ['a look-alike host', { url: 'https://player.mediadelivery.net.evil.com/embed/1/abc' }],
  ])('stays a file: %s', (_name, item) => {
    expect(resolveModuleVideoPlayback(item).mode).toBe('file');
    expect(isModuleBunnyEmbed(item)).toBe(false);
    expect(resolveExploreVideoPlayback({ videoFileUrl: item.url }).mode).toBe('file');
  });

  it('a video marked as an embed is an embed whatever the address says', () => {
    expect(resolveModuleVideoPlayback({ videoSource: 'embed', embedUrl: 'https://example.com/x' }).mode).toBe('embed');
    expect(resolveExploreVideoPlayback({ videoFile: { videoSource: 'embed', embedUrl: 'https://example.com/x' } }).mode).toBe('embed');
  });

  it('a video marked as an upload stays a file even with a Bunny-looking address', () => {
    expect(resolveModuleVideoPlayback({ videoSource: 'upload', url: PLAYER }).mode).toBe('file');
  });
});
