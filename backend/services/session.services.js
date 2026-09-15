const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');
const logger = require('../config/logger');

/** Parse a positive-integer env var, else fall back. */
function envInt(name, fallback) {
  const raw = parseInt(process.env[name] || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Refresh tokens live much longer than access tokens — default 30 days. */
const REFRESH_TOKEN_TTL_MS = envInt('REFRESH_TOKEN_EXPIRE_DAYS', 30) * 24 * 60 * 60 * 1000;

const hashToken = (plainToken) => crypto.createHash('sha256').update(plainToken).digest('hex');

const generatePlainToken = () => crypto.randomBytes(48).toString('hex');

/**
 * Issue a brand-new refresh token for a user (login, OTP verify, register, or any other
 * "session created" moment). Does not touch any existing tokens for that user — a user can hold
 * several concurrent sessions (multiple devices/browsers).
 * @param {string} userId
 * @param {{ deviceLabel?: string, userAgent?: string, ip?: string }} [meta]
 * @returns {Promise<{ plainToken: string, doc: import('mongoose').Document }>}
 */
async function issueRefreshToken(userId, meta = {}) {
  const plainToken = generatePlainToken();
  const doc = await RefreshToken.create({
    userId,
    tokenHash: hashToken(plainToken),
    deviceLabel: meta.deviceLabel || null,
    userAgent: meta.userAgent || null,
    ip: meta.ip || null,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
  return { plainToken, doc };
}

/**
 * Rotate a refresh token: validate it, revoke it, issue a new one linked via `replacedBy`.
 *
 * Reuse detection: if the presented token has ALREADY been rotated (`replacedBy` set) or is
 * already revoked, that means either a race (rare, harmless to treat the same way) or a stolen
 * token being replayed after the legitimate client moved on — either way, the safe response is to
 * revoke every other active token for that user and force a fresh login everywhere.
 *
 * @param {string} plainToken
 * @param {{ deviceLabel?: string, userAgent?: string, ip?: string }} [meta]
 * @returns {Promise<{ ok: true, userId: string, plainToken: string } | { ok: false, reason: 'not_found' | 'expired' | 'reused' }>}
 */
async function rotateRefreshToken(plainToken, meta = {}) {
  if (!plainToken || typeof plainToken !== 'string') {
    return { ok: false, reason: 'not_found' };
  }

  const tokenHash = hashToken(plainToken);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing) {
    return { ok: false, reason: 'not_found' };
  }

  if (existing.revokedAt || existing.replacedBy) {
    logger.warn(
      { userId: String(existing.userId), refreshTokenId: String(existing._id) },
      '[Session] ALERT: refresh token reuse detected — revoking all sessions for this user'
    );
    await revokeAllForUser(existing.userId);
    return { ok: false, reason: 'reused' };
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  const { plainToken: newPlainToken, doc: newDoc } = await issueRefreshToken(existing.userId, meta);
  existing.revokedAt = new Date();
  existing.replacedBy = newDoc._id;
  await existing.save();

  return { ok: true, userId: String(existing.userId), plainToken: newPlainToken };
}

/** Revoke exactly the session behind one refresh token (used by logout). Safe to call with an
 * unknown/already-revoked token — a logout should never fail because the cookie was stale. */
async function revokeRefreshToken(plainToken) {
  if (!plainToken || typeof plainToken !== 'string') return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(plainToken), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

/** Revoke every active refresh token for a user (logout-all, or a security event: password
 * change/reset, role change, deactivation). */
async function revokeAllForUser(userId) {
  await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}

/** Active (not revoked, not expired) sessions for a user, newest first — for "manage devices". */
async function listActiveSessions(userId) {
  const rows = await RefreshToken.find({
    userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .select('_id deviceLabel userAgent ip createdAt expiresAt')
    .lean();

  return rows.map((r) => ({
    id: String(r._id),
    deviceLabel: r.deviceLabel,
    userAgent: r.userAgent,
    ip: r.ip,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
  }));
}

/** Revoke one session by id — only if it belongs to the requesting user (parent A must never be
 * able to revoke parent B's session by guessing/enumerating an id). Returns whether it revoked
 * anything, so the controller can 404 on a no-op. */
async function revokeSessionById(userId, sessionId) {
  const result = await RefreshToken.updateOne(
    { _id: sessionId, userId, revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

module.exports = {
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  listActiveSessions,
  revokeSessionById,
  // exported for tests
  hashToken,
  REFRESH_TOKEN_TTL_MS,
};
