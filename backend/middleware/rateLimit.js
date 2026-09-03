/**
 * Rate limiting for authentication endpoints (RUK-SEC-007).
 *
 * Protects login, registration, password reset, and the admin login-OTP flow from brute force,
 * credential stuffing, and OTP guessing. Per-IP, in-memory.
 *
 * LIMITATIONS (tracked as follow-ups, not part of this change):
 *  - In-memory store: under pm2 cluster mode each worker keeps its own counters, so the effective
 *    limit is roughly `limit * workerCount`. A shared store (Redis/Mongo) is a later step.
 *  - Per-IP only: no per-account lockout, and no per-token cap on OTP / reset-code guesses. Those
 *    are separate follow-ups.
 *  - Keys are `req.ip`, which is only the real client IP when Express `trust proxy` is configured
 *    to match the number of proxy hops in front of the API (see server.js / TRUST_PROXY).
 *
 * All windows/limits are overridable via env so ops can tune without a code change.
 */
const { rateLimit } = require('express-rate-limit');

const MINUTE = 60 * 1000;

/** Parse a positive integer env var, else fall back. */
function envInt(name, fallback) {
  const raw = parseInt(process.env[name] || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Shared 429 response — generic on purpose (no "account locked" / "no such user" leakage). */
function rateLimitHandler(req, res, next, options) {
  const resetTime = req.rateLimit && req.rateLimit.resetTime;
  if (resetTime instanceof Date) {
    const retryAfterSec = Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000));
    res.set('Retry-After', String(retryAfterSec));
  }
  res.status((options && options.statusCode) || 429).json({
    success: false,
    message: 'Too many requests. Please wait a moment and try again.',
  });
}

/**
 * Build an auth rate limiter. Any extra `express-rate-limit` option can be passed and overrides
 * the defaults (used by tests to inject a fake store / disable env-specific validation).
 * @param {{ windowMs: number, limit: number } & Record<string, unknown>} opts
 * @returns {import('express').RequestHandler}
 */
function makeAuthLimiter({ windowMs, limit, ...rest }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true, // RateLimit-* headers
    legacyHeaders: false,
    handler: rateLimitHandler,
    ...rest,
  });
}

/** Login + admin OTP verification. A household/office fat-fingering a password stays under this. */
const loginLimiter = makeAuthLimiter({
  windowMs: envInt('AUTH_LOGIN_WINDOW_MS', 15 * MINUTE),
  limit: envInt('AUTH_LOGIN_MAX', 20),
});

/** Account creation + newsletter subscribe — you don't legitimately do this many times. */
const registerLimiter = makeAuthLimiter({
  windowMs: envInt('AUTH_REGISTER_WINDOW_MS', 60 * MINUTE),
  limit: envInt('AUTH_REGISTER_MAX', 10),
});

/**
 * Password-reset + OTP-resend flow. Tighter — these send emails and are the brute-force target
 * for the 6-digit reset/OTP codes.
 */
const passwordResetLimiter = makeAuthLimiter({
  windowMs: envInt('AUTH_PASSWORD_RESET_WINDOW_MS', 60 * MINUTE),
  limit: envInt('AUTH_PASSWORD_RESET_MAX', 10),
});

/**
 * Unauthenticated public lead/contact forms (RUK-SEC-022): the sales-site "invitation" and
 * "school application" forms. They write to the DB and push to a third-party email service, so
 * they're a spam / cost-amplification target. A person submits once; a school NAT a handful.
 */
const publicFormLimiter = makeAuthLimiter({
  windowMs: envInt('PUBLIC_FORM_WINDOW_MS', 60 * MINUTE),
  limit: envInt('PUBLIC_FORM_MAX', 8),
});

module.exports = {
  makeAuthLimiter,
  rateLimitHandler,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  publicFormLimiter,
};
