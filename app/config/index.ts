/**
 * Rise Up Kids app configuration
 */

export * from './theme';

// API base URL - same backend as web frontend (from .env or EAS build env)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://api.riseup.kids/api';

if (__DEV__ || process.env.EXPO_PUBLIC_LOG_API_URL === 'true') {
  console.log('[RiseUpKids] API_BASE_URL:', API_BASE_URL);
}

/** Backend origin (no /api) for WebView URLs e.g. HTML5 launch. Derived from API_BASE_URL when not set. */
export const BACKEND_ORIGIN =
  (process.env.EXPO_PUBLIC_BACKEND_ORIGIN ?? API_BASE_URL.replace(/\/api\/?$/, '')) || API_BASE_URL;

export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? 'Rise Up Kids';
export const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0';

/**
 * Referer sent when loading Bunny Stream embed pages in WebView.
 * Must match a domain in the video library's Bunny "Allowed domains" list
 * (e.g. app.riseup.kids — without https:// in Bunny dashboard).
 */
export const BUNNY_EMBED_REFERER =
  process.env.EXPO_PUBLIC_BUNNY_EMBED_REFERER ?? 'https://app.riseup.kids';
