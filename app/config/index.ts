/**
 * Rise Up Kids app configuration
 */

export * from './theme';

// API base URL - same backend as web frontend (from .env or EAS build env)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

if (__DEV__) {
  console.log('API_BASE_URL:', API_BASE_URL);
}

/** Backend origin (no /api) for WebView URLs e.g. HTML5 launch. Derived from API_BASE_URL when not set. */
export const BACKEND_ORIGIN =
  (process.env.EXPO_PUBLIC_BACKEND_ORIGIN ?? API_BASE_URL.replace(/\/api\/?$/, '')) || API_BASE_URL;

export const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME ?? 'Rise Up Kids';
export const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0';
