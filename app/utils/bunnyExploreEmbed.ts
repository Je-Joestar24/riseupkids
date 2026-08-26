/**
 * Bunny Stream iframe embed URLs for Explore / video content.
 * Mirrors frontend/src/utils/bunnyExploreEmbed.js and backend bunnyEmbed.util.js
 * @see https://docs.bunny.net/docs/stream-embedding-videos
 * @see docs/BUNNY_EMBED_WATCH_ONLY_PLAN.md
 */

export const BUNNY_IFRAME_HOST = 'iframe.mediadelivery.net';

/** Bunny may expose embed pages on either host depending on dashboard copy source. */
export const BUNNY_EMBED_HOSTS = [
  BUNNY_IFRAME_HOST,
  'player.mediadelivery.net',
] as const;

export type BunnyEmbedPlaybackPreset = 'watchOnly' | 'backgroundLoop' | 'default';

export type BunnyEmbedInteractionMode = 'watchOnly' | 'interactive';

export interface BuildBunnyEmbedWebViewUrlOptions {
  preset?: BunnyEmbedPlaybackPreset;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: boolean;
  playsinline?: boolean;
  disableIosPlayer?: boolean;
  disableAirplay?: boolean;
}

function isBunnyEmbedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return BUNNY_EMBED_HOSTS.some((allowed) => allowed === host);
}

/** Client-side check (server validates authoritatively on create/update). */
export function looksLikeBunnyExploreEmbedUrl(value: unknown): value is string {
  if (value == null || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return (
      u.protocol === 'https:' &&
      isBunnyEmbedHost(u.hostname) &&
      u.pathname.toLowerCase().startsWith('/embed/')
    );
  } catch {
    return false;
  }
}

function setBoolParam(u: URL, key: string, value: boolean | undefined): void {
  if (value === undefined) return;
  u.searchParams.set(key, value ? 'true' : 'false');
}

function applyPresetDefaults(
  preset: BunnyEmbedPlaybackPreset
): Required<
  Pick<
    BuildBunnyEmbedWebViewUrlOptions,
    | 'autoplay'
    | 'muted'
    | 'loop'
    | 'preload'
    | 'playsinline'
    | 'disableIosPlayer'
    | 'disableAirplay'
  >
> {
  switch (preset) {
    case 'watchOnly':
      return {
        autoplay: true,
        muted: false,
        loop: false,
        preload: true,
        playsinline: true,
        disableIosPlayer: true,
        disableAirplay: true,
      };
    case 'backgroundLoop':
      return {
        autoplay: true,
        muted: true,
        loop: true,
        preload: true,
        playsinline: true,
        disableIosPlayer: true,
        disableAirplay: true,
      };
    case 'default':
    default:
      return {
        autoplay: false,
        muted: false,
        loop: false,
        preload: false,
        playsinline: true,
        disableIosPlayer: false,
        disableAirplay: false,
      };
  }
}

/**
 * Normalize Bunny embed URL for React Native WebView (direct URI load, not nested iframe).
 * Adds mobile-friendly query params from preset / overrides.
 */
export function buildBunnyEmbedWebViewUrl(
  embedUrl: string,
  options: BuildBunnyEmbedWebViewUrlOptions = {}
): string {
  const trimmed = embedUrl.trim();
  try {
    const u = new URL(trimmed);
    const preset = options.preset ?? 'watchOnly';
    const defaults = applyPresetDefaults(preset);

    const autoplay = options.autoplay ?? defaults.autoplay;
    const muted = options.muted ?? defaults.muted;
    const loop = options.loop ?? defaults.loop;
    const preload = options.preload ?? defaults.preload;
    const playsinline = options.playsinline ?? defaults.playsinline;
    const disableIosPlayer = options.disableIosPlayer ?? defaults.disableIosPlayer;
    const disableAirplay = options.disableAirplay ?? defaults.disableAirplay;

    // Always force these for child mobile WebView safety when preset requests them.
    if (playsinline) u.searchParams.set('playsinline', 'true');
    if (autoplay) u.searchParams.set('autoplay', 'true');
    if (preload) u.searchParams.set('preload', 'true');
    if (muted) u.searchParams.set('muted', 'true');
    if (loop) u.searchParams.set('loop', 'true');
    if (disableIosPlayer) u.searchParams.set('disableIosPlayer', 'true');
    if (disableAirplay) u.searchParams.set('disableAirplay', 'true');
    if (preset === 'watchOnly' || preset === 'backgroundLoop') {
      u.searchParams.set('showSpeed', 'false');
      u.searchParams.set('chromecast', 'false');
    }

    // Explicit false overrides when caller opts out (rare).
    if (options.autoplay === false) setBoolParam(u, 'autoplay', false);
    if (options.muted === false) setBoolParam(u, 'muted', false);
    if (options.loop === false) setBoolParam(u, 'loop', false);

    return u.toString();
  } catch {
    return trimmed;
  }
}

/** Watch-only child players must not receive touch events on the Bunny surface. */
export function shouldBlockBunnyTouch(interactionMode: BunnyEmbedInteractionMode): boolean {
  return interactionMode === 'watchOnly';
}

/** Watch-only must never enable native AVPlayer / Bunny fullscreen (rotate + controls). */
export function resolveBunnyNativeFullscreenAllowed(
  interactionMode: BunnyEmbedInteractionMode,
  allowNativeFullscreen?: boolean
): boolean {
  if (interactionMode === 'watchOnly') return false;
  return allowNativeFullscreen !== false;
}

/**
 * Build a validated WebView source for watch-only playback (contract helper for tests + callers).
 */
export function buildBunnyWatchOnlyWebViewSource(
  embedUrl: string | null | undefined,
  referer: string
): { uri: string; headers: { Referer: string; referer: string } } | null {
  if (!embedUrl || !looksLikeBunnyExploreEmbedUrl(embedUrl)) return null;
  return {
    uri: buildBunnyEmbedWebViewUrl(embedUrl.trim(), { preset: 'watchOnly' }),
    headers: {
      Referer: referer,
      referer: referer,
    },
  };
}
