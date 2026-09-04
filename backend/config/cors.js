/**
 * CORS policy for the API (RUK-SEC-025).
 *
 *  - CORS_ORIGIN set  → allow only the listed origins (comma-separated), plus requests with no
 *    Origin / Origin: null (native app builds send that).
 *  - CORS_ORIGIN unset + production/staging → the server refuses to start (assertCorsConfig).
 *  - CORS_ORIGIN unset + development → allow only http(s)://localhost and 127.0.0.1. No wildcard
 *    (the old `*.expo.dev` / `*.expo.run` allowance let an attacker host at evil.expo.dev).
 */
function isProdLike(env = process.env) {
  return ['production', 'staging'].includes((env.NODE_ENV || '').toLowerCase());
}

/**
 * @param {string|undefined|null} origin
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
function isOriginAllowed(origin, env = process.env) {
  const noOrigin =
    origin === undefined || origin === null || origin === '' || String(origin) === 'null';

  if (env.CORS_ORIGIN) {
    const allowed = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
    return noOrigin || allowed.includes(origin);
  }

  return noOrigin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(String(origin));
}

/** Throw at startup if the config is unsafe for this environment. */
function assertCorsConfig(env = process.env) {
  if (!env.CORS_ORIGIN && isProdLike(env)) {
    throw new Error('CORS_ORIGIN must be set in production/staging.');
  }
}

/** @returns {import('cors').CorsOptions} */
function buildCorsOptions() {
  return {
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    credentials: true,
  };
}

module.exports = { isOriginAllowed, assertCorsConfig, buildCorsOptions, isProdLike };
