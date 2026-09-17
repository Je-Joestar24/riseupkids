/**
 * Chunk 11 — Mobile App Security: WebView hardening. Pure helper (no react-native-webview import
 * — Jest-safe), used to lock a WebView down to a single trusted origin instead of
 * originWhitelist={['*']}, which lets the page navigate anywhere at all.
 */

/** @returns `protocol//host` (including a non-default port), or null if `url` doesn't parse. */
export function getOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}
