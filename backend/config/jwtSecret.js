/**
 * JWT secret strength policy (RUK-SEC-003).
 *
 * Every JWT in this app (login, admin OTP session, checkout/webhook auto-login, SCORM wrapper
 * token) is signed with `process.env.JWT_SECRET`. A missing or guessable secret lets anyone
 * forge a token for any user, including admin. This module is called once at server startup so
 * a bad secret fails loud (process exits) instead of silently running an unforgeable-in-name-only
 * auth system.
 */

/** Values seen in `.env.example` / tutorials — never acceptable, in any environment. */
const KNOWN_WEAK_SECRETS = new Set([
  'your_super_secret_jwt_key_change_this_in_production',
  'secret',
  'changeme',
  'change_this_in_production',
  'jwt_secret',
  'jwtsecret',
  'test-jwt-secret',
  'test-secret',
]);

const MIN_LENGTH_PROD = 32;

function isProdLikeEnv(nodeEnv) {
  return ['production', 'staging'].includes(String(nodeEnv || '').toLowerCase());
}

/**
 * Throws if `process.env.JWT_SECRET` is missing or a known-weak value; in production/staging
 * also throws if it's shorter than 32 characters. In development a short (but not known-weak)
 * secret only warns, so local setup isn't blocked.
 * @throws {Error}
 */
function assertStrongJwtSecret(env = process.env) {
  const secret = env.JWT_SECRET;
  const nodeEnv = env.NODE_ENV;
  const prodLike = isProdLikeEnv(nodeEnv);

  if (!secret || !secret.trim()) {
    throw new Error(
      'JWT_SECRET is not set. Generate one with `openssl rand -hex 32` and set it in .env before starting the server.'
    );
  }

  if (KNOWN_WEAK_SECRETS.has(secret.trim().toLowerCase())) {
    throw new Error(
      'JWT_SECRET is set to a known example/default value. This is never safe to run with — generate a real secret with `openssl rand -hex 32`.'
    );
  }

  if (secret.length < MIN_LENGTH_PROD) {
    if (prodLike) {
      throw new Error(
        `JWT_SECRET must be at least ${MIN_LENGTH_PROD} characters in ${nodeEnv}. Generate one with \`openssl rand -hex 32\`.`
      );
    }
    // eslint-disable-next-line no-console
    console.warn(
      `[Security] JWT_SECRET is shorter than ${MIN_LENGTH_PROD} characters. Only acceptable in local development — set a strong secret before deploying.`
    );
  }
}

module.exports = { assertStrongJwtSecret, KNOWN_WEAK_SECRETS, MIN_LENGTH_PROD, isProdLikeEnv };
