import {
  buildBunnyEmbedWebViewUrl,
  buildBunnyWatchOnlyWebViewSource,
  looksLikeBunnyExploreEmbedUrl,
  resolveBunnyNativeFullscreenAllowed,
  shouldBlockBunnyTouch,
} from '@/utils/bunnyExploreEmbed';

const IFRAME_EMBED =
  'https://iframe.mediadelivery.net/embed/12345/abcdef-uuid';
const PLAYER_EMBED =
  'https://player.mediadelivery.net/embed/12345/abcdef-uuid';

describe('looksLikeBunnyExploreEmbedUrl', () => {
  it('accepts iframe and player mediadelivery embed hosts', () => {
    expect(looksLikeBunnyExploreEmbedUrl(IFRAME_EMBED)).toBe(true);
    expect(looksLikeBunnyExploreEmbedUrl(PLAYER_EMBED)).toBe(true);
  });

  it('rejects non-embed or insecure URLs', () => {
    expect(looksLikeBunnyExploreEmbedUrl('https://iframe.mediadelivery.net/play/1/2')).toBe(
      false
    );
    expect(looksLikeBunnyExploreEmbedUrl('http://iframe.mediadelivery.net/embed/1/2')).toBe(
      false
    );
    expect(looksLikeBunnyExploreEmbedUrl('https://example.com/embed/1/2')).toBe(false);
    expect(looksLikeBunnyExploreEmbedUrl('')).toBe(false);
    expect(looksLikeBunnyExploreEmbedUrl(null)).toBe(false);
  });
});

describe('buildBunnyEmbedWebViewUrl', () => {
  it('watchOnly forces autoplay, preload, playsinline, and disables native iOS player / AirPlay', () => {
    const url = buildBunnyEmbedWebViewUrl(IFRAME_EMBED, { preset: 'watchOnly' });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('autoplay')).toBe('true');
    expect(parsed.searchParams.get('preload')).toBe('true');
    expect(parsed.searchParams.get('playsinline')).toBe('true');
    expect(parsed.searchParams.get('disableIosPlayer')).toBe('true');
    expect(parsed.searchParams.get('disableAirplay')).toBe('true');
    expect(parsed.searchParams.get('muted')).toBe('false');
    expect(parsed.searchParams.get('loop')).toBeNull();
    expect(parsed.searchParams.get('showSpeed')).toBe('false');
    expect(parsed.searchParams.get('chromecast')).toBe('false');
  });

  it('watchOnly strips muted=true from stored embed URLs so sound plays', () => {
    const url = buildBunnyEmbedWebViewUrl(
      `${IFRAME_EMBED}?autoplay=true&muted=true`,
      { preset: 'watchOnly' }
    );
    expect(new URL(url).searchParams.get('muted')).toBe('false');
    expect(new URL(url).searchParams.get('autoplay')).toBe('true');
  });

  it('backgroundLoop forces muted autoplay loop', () => {
    const url = buildBunnyEmbedWebViewUrl(IFRAME_EMBED, { preset: 'backgroundLoop' });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('autoplay')).toBe('true');
    expect(parsed.searchParams.get('muted')).toBe('true');
    expect(parsed.searchParams.get('loop')).toBe('true');
    expect(parsed.searchParams.get('playsinline')).toBe('true');
    expect(parsed.searchParams.get('disableIosPlayer')).toBe('true');
  });

  it('defaults to watchOnly when preset omitted', () => {
    const url = buildBunnyEmbedWebViewUrl(IFRAME_EMBED);
    expect(new URL(url).searchParams.get('autoplay')).toBe('true');
  });

  it('preserves existing unrelated query params', () => {
    const withToken = `${IFRAME_EMBED}?token=abc&expires=999`;
    const url = buildBunnyEmbedWebViewUrl(withToken, { preset: 'watchOnly' });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('token')).toBe('abc');
    expect(parsed.searchParams.get('expires')).toBe('999');
    expect(parsed.searchParams.get('autoplay')).toBe('true');
  });

  it('returns trimmed string when URL cannot be parsed', () => {
    expect(buildBunnyEmbedWebViewUrl('  not-a-url  ')).toBe('not-a-url');
  });
});

describe('buildBunnyWatchOnlyWebViewSource', () => {
  it('returns null for invalid embed', () => {
    expect(buildBunnyWatchOnlyWebViewSource(null, 'https://app.riseup.kids')).toBeNull();
    expect(buildBunnyWatchOnlyWebViewSource('https://evil.com', 'https://app.riseup.kids')).toBeNull();
  });

  it('builds referer headers and watchOnly uri', () => {
    const source = buildBunnyWatchOnlyWebViewSource(IFRAME_EMBED, 'https://app.riseup.kids');
    expect(source).not.toBeNull();
    expect(source!.headers.Referer).toBe('https://app.riseup.kids');
    expect(source!.headers.referer).toBe('https://app.riseup.kids');
    expect(new URL(source!.uri).searchParams.get('autoplay')).toBe('true');
    expect(new URL(source!.uri).searchParams.get('disableIosPlayer')).toBe('true');
  });
});

describe('watch-only interaction helpers', () => {
  it('blocks touch only in watchOnly mode', () => {
    expect(shouldBlockBunnyTouch('watchOnly')).toBe(true);
    expect(shouldBlockBunnyTouch('interactive')).toBe(false);
  });

  it('never allows native fullscreen in watchOnly mode', () => {
    expect(resolveBunnyNativeFullscreenAllowed('watchOnly', true)).toBe(false);
    expect(resolveBunnyNativeFullscreenAllowed('watchOnly', false)).toBe(false);
    expect(resolveBunnyNativeFullscreenAllowed('interactive', true)).toBe(true);
    expect(resolveBunnyNativeFullscreenAllowed('interactive', false)).toBe(false);
  });
});
