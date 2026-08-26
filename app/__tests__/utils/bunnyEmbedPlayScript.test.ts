import {
  BUNNY_EMBED_HIDE_CONTROLS_CSS,
  BUNNY_EMBED_IOS_INSTALLER_RETRY_MS,
  BUNNY_EMBED_LOADING_TIMEOUT_MS,
  BUNNY_EMBED_PLAY_WALL_ID,
  BUNNY_EMBED_PLAY_WALL_READY_MESSAGE,
  buildBunnyEmbedPlayWallInstallerScript,
  buildBunnyEmbedTogglePlaybackScript,
  isBunnyEmbedPlayWallReadyMessage,
  isFatalBunnyEmbedHttpError,
  shouldUncoverBunnyWebViewForGestures,
} from '@/utils/bunnyEmbedPlayScript';

describe('buildBunnyEmbedTogglePlaybackScript', () => {
  it('toggles play and pause on media and player.js', () => {
    const script = buildBunnyEmbedTogglePlaybackScript({ keepMuted: false, allowPause: true });
    expect(script).toContain('media.play()');
    expect(script).toContain('media.pause()');
    expect(script).toContain("postMethod('play')");
    expect(script).toContain("postMethod('pause')");
    expect(script).toContain('media-controller');
    expect(script).toContain('__riseUpKidsToggleBunnyEmbed');
    expect(script).toContain('true;');
  });

  it('keeps CMS background loops muted and does not pause them', () => {
    const script = buildBunnyEmbedTogglePlaybackScript({ keepMuted: true, allowPause: false });
    expect(script).toContain('media.muted = true');
    expect(script).not.toContain('media.muted = false');
    expect(script).not.toContain('media.pause()');
    expect(script).not.toContain("method: 'unmute'");
  });

  it('unmutes watch-only videos after a muted fallback play', () => {
    const script = buildBunnyEmbedTogglePlaybackScript({ keepMuted: false, allowPause: true });
    expect(script).toContain('media.muted = false');
    expect(script).toContain('media.volume = 1');
    expect(script).toContain("method: 'unmute'");
  });

  it('unmutes watch-only media even when autoplay already started muted', () => {
    const installer = buildBunnyEmbedPlayWallInstallerScript({
      keepMuted: false,
      allowPause: true,
    });
    expect(installer).toContain('playAllBunnyMedia()');
    expect(installer).toContain('media.muted = false');
  });
});

describe('buildBunnyEmbedPlayWallInstallerScript', () => {
  it('hides Bunny default controls and installs a tap wall', () => {
    const script = buildBunnyEmbedPlayWallInstallerScript({ keepMuted: false, allowPause: true });
    expect(script).toContain(BUNNY_EMBED_PLAY_WALL_ID);
    expect(script).toContain('media-control-bar');
    expect(script).toContain('media-play-button');
    expect(script).toContain('.plyr__controls');
    expect(script).toContain('wall.onclick');
    expect(script).toContain('ontouchstart');
    expect(script).toContain("addEventListener('touchstart'");
    expect(script).toContain('playsInline = true');
    expect(script).toContain(BUNNY_EMBED_PLAY_WALL_READY_MESSAGE);
    expect(script).toContain('__riseUpKidsToggleBunnyEmbed');
    expect(script).not.toContain('MutationObserver');
  });
});

describe('BUNNY_EMBED_HIDE_CONTROLS_CSS', () => {
  it('targets Media Chrome and legacy Plyr chrome', () => {
    expect(BUNNY_EMBED_HIDE_CONTROLS_CSS).toContain('bunny-media-control-bar');
    expect(BUNNY_EMBED_HIDE_CONTROLS_CSS).toContain('media-fullscreen-button');
    expect(BUNNY_EMBED_HIDE_CONTROLS_CSS).toContain('display: none !important');
  });
});

describe('isBunnyEmbedPlayWallReadyMessage', () => {
  it('accepts JSON and raw ready payloads', () => {
    expect(
      isBunnyEmbedPlayWallReadyMessage(
        JSON.stringify({ type: BUNNY_EMBED_PLAY_WALL_READY_MESSAGE })
      )
    ).toBe(true);
    expect(isBunnyEmbedPlayWallReadyMessage(BUNNY_EMBED_PLAY_WALL_READY_MESSAGE)).toBe(true);
    expect(isBunnyEmbedPlayWallReadyMessage('{"type":"other"}')).toBe(false);
    expect(isBunnyEmbedPlayWallReadyMessage('')).toBe(false);
  });
});

describe('shouldUncoverBunnyWebViewForGestures', () => {
  const ready = {
    blockTouch: true,
    allowPause: true,
    playWallReady: false,
    isLoading: false,
    hasError: false,
  };

  it('uncovers iOS immediately after load so WKWebView receives the tap gesture', () => {
    expect(shouldUncoverBunnyWebViewForGestures({ ...ready, platformOs: 'ios' })).toBe(true);
    expect(
      shouldUncoverBunnyWebViewForGestures({ ...ready, isLoading: true, platformOs: 'ios' })
    ).toBe(false);
  });

  it('waits for the in-page wall on Android before uncovering', () => {
    expect(shouldUncoverBunnyWebViewForGestures({ ...ready, platformOs: 'android' })).toBe(
      false
    );
    expect(
      shouldUncoverBunnyWebViewForGestures({
        ...ready,
        playWallReady: true,
        platformOs: 'android',
      })
    ).toBe(true);
  });
});

describe('isFatalBunnyEmbedHttpError', () => {
  const embed = 'https://iframe.mediadelivery.net/embed/1/abc';

  it('ignores subresource failures so loading is not blocked by analytics or thumbs', () => {
    expect(
      isFatalBunnyEmbedHttpError('https://iframe.mediadelivery.net/favicon.ico', 404, embed)
    ).toBe(false);
    expect(isFatalBunnyEmbedHttpError(embed, 200, embed)).toBe(false);
    expect(isFatalBunnyEmbedHttpError(undefined, 500, embed)).toBe(false);
  });

  it('treats the main embed document 4xx/5xx as fatal', () => {
    expect(isFatalBunnyEmbedHttpError(`${embed}?autoplay=true`, 404, embed)).toBe(true);
    expect(isFatalBunnyEmbedHttpError(embed, 500, embed)).toBe(true);
  });
});

describe('BUNNY_EMBED_LOADING_TIMEOUT_MS', () => {
  it('fails open so the loading overlay cannot stay forever', () => {
    expect(BUNNY_EMBED_LOADING_TIMEOUT_MS).toBeGreaterThan(0);
    expect(BUNNY_EMBED_LOADING_TIMEOUT_MS).toBeLessThanOrEqual(8000);
  });
});

describe('BUNNY_EMBED_IOS_INSTALLER_RETRY_MS', () => {
  it('applies the installer once after load instead of polling during load', () => {
    expect(BUNNY_EMBED_IOS_INSTALLER_RETRY_MS).toEqual([800]);
  });
});
