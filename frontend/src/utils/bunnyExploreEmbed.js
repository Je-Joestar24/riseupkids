const BUNNY_IFRAME_HOST = 'iframe.mediadelivery.net';

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

export { BUNNY_IFRAME_HOST };
