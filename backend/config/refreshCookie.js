/**
 * httpOnly refresh-token cookie (Chunk 9). Centralized so every place that sets/clears it
 * (login, OTP verify, register, post-payment auto-login, /refresh, /logout) uses identical
 * options — a mismatch between the options used to set vs. clear a cookie means the browser
 * won't actually remove it.
 *
 * Production/staging: frontend (S3/CloudFront) and API are different origins, so the cookie must
 * be `SameSite=None; Secure` to be sent cross-site at all — browsers reject `SameSite=None`
 * without `Secure`. Development: usually plain http://localhost, where `Secure` cookies don't
 * work at all, so this falls back to `SameSite=Lax; Secure=false` there.
 *
 * Mobile (Expo/React Native) has no browser-style automatic cookie jar, so it can't rely on this
 * cookie at all — the app instead stores the refresh token itself (interim: AsyncStorage; a real
 * secure-storage migration is Chunk 11) and sends it explicitly. `getRefreshToken()` below is the
 * single place that accepts EITHER transport: the cookie (web) or an `X-Client-Platform: mobile`
 * request tagged with `refreshToken` in the body (app). The `X-Client-Platform` header is what the
 * server uses to decide whether to also put the refresh token in the JSON response body — for a
 * browser it never appears there (httpOnly cookie only), so this is a real, not cosmetic, gate.
 */
const COOKIE_NAME = 'rt';
const COOKIE_PATH = '/api/auth';
const MOBILE_PLATFORM_HEADER = 'x-client-platform';
const MOBILE_PLATFORM_VALUE = 'mobile';

const isProdLike = () => ['production', 'staging'].includes((process.env.NODE_ENV || '').toLowerCase());

function refreshCookieOptions(maxAgeMs) {
  const opts = {
    httpOnly: true,
    secure: isProdLike(),
    sameSite: isProdLike() ? 'none' : 'lax',
    path: COOKIE_PATH,
  };
  if (typeof maxAgeMs === 'number') {
    opts.maxAge = maxAgeMs;
  }
  return opts;
}

function setRefreshCookie(res, plainToken, maxAgeMs) {
  res.cookie(COOKIE_NAME, plainToken, refreshCookieOptions(maxAgeMs));
}

function clearRefreshCookie(res) {
  // clearCookie must be called with the SAME attributes (minus maxAge/expires) used to set it.
  res.clearCookie(COOKIE_NAME, refreshCookieOptions());
}

function getRefreshCookie(req) {
  return req.cookies ? req.cookies[COOKIE_NAME] : undefined;
}

/** True when the request is tagged as coming from the mobile app, not a browser. */
function isMobileClient(req) {
  return (req.headers?.[MOBILE_PLATFORM_HEADER] || '').toLowerCase() === MOBILE_PLATFORM_VALUE;
}

/** Read the refresh token from whichever transport the caller actually used: the httpOnly
 * cookie (web) first, then an explicit body field (mobile — it has no cookie jar to check). */
function getRefreshToken(req) {
  const fromCookie = getRefreshCookie(req);
  if (fromCookie) return fromCookie;
  const fromBody = req.body && typeof req.body.refreshToken === 'string' ? req.body.refreshToken : undefined;
  return fromBody || undefined;
}

module.exports = {
  COOKIE_NAME,
  COOKIE_PATH,
  MOBILE_PLATFORM_HEADER,
  MOBILE_PLATFORM_VALUE,
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshCookie,
  getRefreshToken,
  isMobileClient,
};
