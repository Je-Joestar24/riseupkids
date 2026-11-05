const BUNNY_IFRAME_HOST = 'iframe.mediadelivery.net';

/**
 * Hosts a Bunny embed can be played from. Bunny is moving embeds from `iframe.` to `player.`; the phone app
 * already accepts both when PLAYING a video. Saving a video (admin) still accepts only BUNNY_IFRAME_HOST,
 * as the server does, so `looksLikeBunnyExploreEmbedUrl` below is unchanged.
 */
const BUNNY_EMBED_HOSTS = [BUNNY_IFRAME_HOST, 'player.mediadelivery.net'];

/**
 * Client-side check for admin preview / submit (server validates authoritatively).
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikeBunnyExploreEmbedUrl(value) {
  if (value == null || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return (
      u.protocol === 'https:' &&
      u.hostname.toLowerCase() === BUNNY_IFRAME_HOST &&
      u.pathname.toLowerCase().startsWith('/embed/')
    );
  } catch {
    return false;
  }
}

/**
 * Is this a Bunny embed that can be PLAYED (either Bunny host)? Used by the child players, as in the app.
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikeBunnyPlaybackEmbedUrl(value) {
  if (value == null || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return (
      u.protocol === 'https:' &&
      BUNNY_EMBED_HOSTS.includes(u.hostname.toLowerCase()) &&
      u.pathname.toLowerCase().startsWith('/embed/')
    );
  } catch {
    return false;
  }
}

/**
 * Query settings for a child watching a Bunny embed. The same presets as the phone app
 * (app/utils/bunnyExploreEmbed.ts): `watchOnly` autoplays with sound and switches off the extras
 * (speed menu, Chromecast, AirPlay, the iOS system player); `default` leaves the URL as stored.
 * @typedef {'watchOnly' | 'default'} BunnyEmbedPreset
 */
const PRESETS = {
  watchOnly: {
    autoplay: 'true',
    muted: 'false',
    preload: 'true',
    playsinline: 'true',
    disableIosPlayer: 'true',
    disableAirplay: 'true',
    showSpeed: 'false',
    chromecast: 'false',
  },
  default: { playsinline: 'true' },
};

/**
 * @param {string} embedUrl A Bunny embed address
 * @param {{ preset?: BunnyEmbedPreset, autoplay?: boolean }} [options]
 * @returns {string} the address with the preset's settings (existing Bunny settings are kept unless the preset sets them)
 */
export function buildBunnyEmbedWatchUrl(embedUrl, { preset = 'watchOnly', autoplay } = {}) {
  const trimmed = typeof embedUrl === 'string' ? embedUrl.trim() : '';
  try {
    const u = new URL(trimmed);
    const settings = { ...(PRESETS[preset] || PRESETS.default) };
    if (autoplay !== undefined) settings.autoplay = autoplay ? 'true' : 'false';
    Object.entries(settings).forEach(([key, value]) => u.searchParams.set(key, value));
    return u.toString();
  } catch {
    return trimmed;
  }
}

export { BUNNY_IFRAME_HOST, BUNNY_EMBED_HOSTS };
