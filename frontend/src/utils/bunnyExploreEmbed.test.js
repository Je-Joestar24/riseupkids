import { describe, it, expect } from 'vitest';
import {
  BUNNY_EMBED_HOSTS,
  BUNNY_IFRAME_HOST,
  buildBunnyEmbedWatchUrl,
  looksLikeBunnyExploreEmbedUrl,
  looksLikeBunnyPlaybackEmbedUrl,
} from './bunnyExploreEmbed';

const IFRAME = 'https://iframe.mediadelivery.net/embed/123/abc-def';
const PLAYER = 'https://player.mediadelivery.net/embed/123/abc-def';

describe('saving a video (admin): only the address the server accepts', () => {
  it('accepts the iframe host', () => {
    expect(looksLikeBunnyExploreEmbedUrl(IFRAME)).toBe(true);
    expect(looksLikeBunnyExploreEmbedUrl(`  ${IFRAME}  `)).toBe(true);
  });

  it('does not accept the player host yet (the server does not), so an admin cannot save what the server refuses', () => {
    expect(looksLikeBunnyExploreEmbedUrl(PLAYER)).toBe(false);
  });
});

describe('playing a video: both Bunny hosts, as in the phone app', () => {
  it.each([IFRAME, PLAYER, `${IFRAME}?autoplay=true`, ` ${PLAYER} `])('accepts %s', (url) => {
    expect(looksLikeBunnyPlaybackEmbedUrl(url)).toBe(true);
  });

  it.each([
    ['plain http', 'http://iframe.mediadelivery.net/embed/1/2'],
    ['another host', 'https://example.com/embed/1/2'],
    ['a host that only starts with the right name', 'https://iframe.mediadelivery.net.evil.com/embed/1/2'],
    ['the right name only in the path', 'https://evil.com/iframe.mediadelivery.net/embed/1/2'],
    ['the right name as a user name', 'https://iframe.mediadelivery.net@evil.com/embed/1/2'],
    ['not an embed path', 'https://iframe.mediadelivery.net/play/1/2'],
    ['a file', 'https://cdn.example.com/video.mp4'],
    ['an empty string', ''],
    ['not a string', null],
    ['a number', 5],
  ])('rejects %s', (_name, value) => {
    expect(looksLikeBunnyPlaybackEmbedUrl(value)).toBe(false);
  });

  it('knows both hosts', () => {
    expect(BUNNY_EMBED_HOSTS).toEqual([BUNNY_IFRAME_HOST, 'player.mediadelivery.net']);
  });
});

describe('buildBunnyEmbedWatchUrl', () => {
  const params = (url) => Object.fromEntries(new URL(url).searchParams);

  it('watch-only: autoplays with sound and switches off the extras (the same settings as the phone app)', () => {
    expect(params(buildBunnyEmbedWatchUrl(IFRAME))).toEqual({
      autoplay: 'true',
      muted: 'false',
      preload: 'true',
      playsinline: 'true',
      disableIosPlayer: 'true',
      disableAirplay: 'true',
      showSpeed: 'false',
      chromecast: 'false',
    });
  });

  it('keeps the address, the path and any Bunny settings it does not set', () => {
    const built = new URL(buildBunnyEmbedWatchUrl(`${PLAYER}?token=abc&expires=99&t=30`));

    expect(`${built.origin}${built.pathname}`).toBe(PLAYER);
    expect(built.searchParams.get('token')).toBe('abc');
    expect(built.searchParams.get('expires')).toBe('99');
    expect(built.searchParams.get('t')).toBe('30');
  });

  it('overrides what is stored in the address (a saved muted=true or autoplay=false must not win)', () => {
    const built = params(buildBunnyEmbedWatchUrl(`${IFRAME}?muted=true&autoplay=false&loop=true`));

    expect(built.muted).toBe('false');
    expect(built.autoplay).toBe('true');
    expect(built.loop).toBe('true'); // not a watch-only setting: left as stored
  });

  it('can start without autoplay (for a play button of our own)', () => {
    expect(params(buildBunnyEmbedWatchUrl(IFRAME, { autoplay: false })).autoplay).toBe('false');
  });

  it('the default preset only asks for inline playback', () => {
    expect(params(buildBunnyEmbedWatchUrl(IFRAME, { preset: 'default' }))).toEqual({ playsinline: 'true' });
  });

  it('an unknown preset is treated as the default one', () => {
    expect(params(buildBunnyEmbedWatchUrl(IFRAME, { preset: 'nope' }))).toEqual({ playsinline: 'true' });
  });

  it('hands back text it cannot read as an address, trimmed', () => {
    expect(buildBunnyEmbedWatchUrl('  not a url ')).toBe('not a url');
    expect(buildBunnyEmbedWatchUrl(undefined)).toBe('');
  });
});
