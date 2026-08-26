/**
 * End-to-end behavioural contract for child Bunny watch-only playback.
 * Complements unit tests in bunnyExploreEmbed.test.ts and manual device QA in
 * docs/BUNNY_EMBED_WATCH_ONLY_PLAN.md.
 */

import {
  BUNNY_EMBED_PLAY_WALL_ID,
  buildBunnyEmbedPlayWallInstallerScript,
  buildBunnyEmbedTogglePlaybackScript,
} from '@/utils/bunnyEmbedPlayScript';
import { buildBunnyEmbedWebViewProps } from '@/utils/bunnyEmbedWebViewProps';
import {
  buildBunnyEmbedWebViewUrl,
  buildBunnyWatchOnlyWebViewSource,
  resolveBunnyNativeFullscreenAllowed,
  shouldBlockBunnyTouch,
} from '@/utils/bunnyExploreEmbed';

const EMBED = 'https://iframe.mediadelivery.net/embed/99/video-guid';
const REFERER = 'https://app.riseup.kids';

describe('Bunny embed watch-only e2e contract', () => {
  it('opens with autoplay URL and Referer so playback can start without child taps', () => {
    const source = buildBunnyWatchOnlyWebViewSource(EMBED, REFERER);
    expect(source).not.toBeNull();

    const params = new URL(source!.uri).searchParams;
    expect(params.get('autoplay')).toBe('true');
    expect(params.get('preload')).toBe('true');
    expect(params.get('playsinline')).toBe('true');
    expect(params.get('muted')).toBe('false');
    expect(source!.headers.Referer).toBe(REFERER);
  });

  it('blocks all touch on the embed surface and disables native fullscreen / iOS player', () => {
    expect(shouldBlockBunnyTouch('watchOnly')).toBe(true);
    expect(resolveBunnyNativeFullscreenAllowed('watchOnly', true)).toBe(false);

    const props = buildBunnyEmbedWebViewProps('watchOnly', true);
    expect(props.allowsFullscreenVideo).toBe(false);
    expect(props.mediaPlaybackRequiresUserAction).toBe(false);
    expect(props.allowsInlineMediaPlayback).toBe(true);
    expect(props.allowsAirPlayForMediaPlayback).toBe(false);

    const url = buildBunnyEmbedWebViewUrl(EMBED, { preset: 'watchOnly' });
    const params = new URL(url).searchParams;
    expect(params.get('disableIosPlayer')).toBe('true');
    expect(params.get('disableAirplay')).toBe('true');
  });

  it('keeps CMS background looping muted without enabling native FS', () => {
    const url = buildBunnyEmbedWebViewUrl(EMBED, { preset: 'backgroundLoop' });
    const params = new URL(url).searchParams;
    expect(params.get('autoplay')).toBe('true');
    expect(params.get('muted')).toBe('true');
    expect(params.get('loop')).toBe('true');
    expect(params.get('disableIosPlayer')).toBe('true');

    const props = buildBunnyEmbedWebViewProps('watchOnly', false);
    expect(props.allowsFullscreenVideo).toBe(false);
  });

  it('toggles playback from the invisible wall and hides Bunny default controls', () => {
    expect(shouldBlockBunnyTouch('watchOnly')).toBe(true);

    const toggle = buildBunnyEmbedTogglePlaybackScript({ keepMuted: false, allowPause: true });
    expect(toggle).toContain('media.play()');
    expect(toggle).toContain('media.pause()');
    expect(toggle).toContain('media-controller');

    const installer = buildBunnyEmbedPlayWallInstallerScript({ keepMuted: false, allowPause: true });
    expect(installer).toContain(BUNNY_EMBED_PLAY_WALL_ID);
    expect(installer).toContain('media-control-bar');
    expect(installer).toContain('ontouchstart');
    expect(installer).toContain("addEventListener('touchstart'");
  });

  it('rejects bad embeds so the UI can show a controlled error instead of loading garbage', () => {
    expect(buildBunnyWatchOnlyWebViewSource('', REFERER)).toBeNull();
    expect(buildBunnyWatchOnlyWebViewSource('https://cdn.example/video.mp4', REFERER)).toBeNull();
  });
});
