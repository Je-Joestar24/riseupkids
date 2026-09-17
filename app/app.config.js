/**
 * Chunk 11 — Mobile App Security: transport hardening.
 *
 * app.json previously set android.usesCleartextTraffic: true unconditionally — that's a global
 * relaxation of Android's default (encrypted-only) network policy, applying to production release
 * builds exactly as much as local dev. Cleartext is only ever actually needed for local dev
 * against a LAN IP backend (see .env.example) — every real build profile (preview,
 * production-apk, production, per eas.json) points at the real https:// API.
 *
 * This derives the flag from the ACTUAL configured API URL instead of a blanket allow: cleartext
 * is permitted only when the app is built to talk to a non-https backend, which in practice means
 * only local development builds. iOS is untouched — it had no ATS exception here, so it already
 * defaults to HTTPS-only.
 */
module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://api.riseup.kids/api';
  const isHttpsApi = apiUrl.startsWith('https://');

  return {
    ...config,
    android: {
      ...config.android,
      usesCleartextTraffic: !isHttpsApi,
    },
  };
};
