/**
 * Bunny Stream iframe embed URLs (public embed player).
 * @see https://docs.bunny.net/docs/stream-embedding-videos
 */

const BUNNY_IFRAME_HOST = 'iframe.mediadelivery.net';

/**
 * Validate and return a canonical embed URL string (HTTPS, allowed host, /embed/ path).
 * Does not perform network I/O.
 *
 * @param {string} raw
 * @returns {string}
 * @throws {Error} When the value is not an acceptable Bunny iframe embed URL
 */
function assertBunnyIframeEmbedUrl(raw) {
  if (raw === undefined || raw === null || typeof raw !== 'string') {
    throw new Error('embedUrl is required for embedded video');
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('embedUrl cannot be empty');
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('embedUrl is not a valid URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('embedUrl must use HTTPS');
  }

  if (parsed.hostname.toLowerCase() !== BUNNY_IFRAME_HOST) {
    throw new Error(`embedUrl host must be ${BUNNY_IFRAME_HOST}`);
  }

  if (!parsed.pathname.toLowerCase().startsWith('/embed/')) {
    throw new Error('embedUrl path must start with /embed/');
  }

  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';

  const out = parsed.toString();
  if (out.length > 2048) {
    throw new Error('embedUrl is too long');
  }

  return out;
}

module.exports = {
  BUNNY_IFRAME_HOST,
  assertBunnyIframeEmbedUrl,
};
