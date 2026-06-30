/**
 * Bunny Stream iframe embed URLs for Explore / video content.
 * Mirrors frontend/src/utils/bunnyExploreEmbed.js and backend bunnyEmbed.util.js
 * @see https://docs.bunny.net/docs/stream-embedding-videos
 */

export const BUNNY_IFRAME_HOST = 'iframe.mediadelivery.net';

/** Bunny may expose embed pages on either host depending on dashboard copy source. */
export const BUNNY_EMBED_HOSTS = [
  BUNNY_IFRAME_HOST,
  'player.mediadelivery.net',
] as const;

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

/**
 * Normalize Bunny embed URL for React Native WebView (direct URI load, not nested iframe).
 * Adds mobile-friendly query params when missing.
 */
export function buildBunnyEmbedWebViewUrl(embedUrl: string): string {
  const trimmed = embedUrl.trim();
  try {
    const u = new URL(trimmed);
    if (!u.searchParams.has('playsinline')) {
      u.searchParams.set('playsinline', 'true');
    }
    return u.toString();
  } catch {
    return trimmed;
  }
}
