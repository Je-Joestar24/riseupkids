/**
 * Bunny Stream iframe embed URLs for Explore / video content.
 * Mirrors frontend/src/utils/bunnyExploreEmbed.js and backend bunnyEmbed.util.js
 * @see https://docs.bunny.net/docs/stream-embedding-videos
 */

export const BUNNY_IFRAME_HOST = 'iframe.mediadelivery.net';

/** Client-side check (server validates authoritatively on create/update). */
export function looksLikeBunnyExploreEmbedUrl(value: unknown): value is string {
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
