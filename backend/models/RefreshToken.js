const mongoose = require('mongoose');

/**
 * Refresh tokens for session hardening (Chunk 9). Only the SHA-256 hash of the opaque, random
 * token is ever stored — the plaintext value exists only in the httpOnly cookie sent to the
 * browser and is never persisted or logged.
 *
 * Rotation: every successful /api/auth/refresh call revokes the token used and issues a new one,
 * linked via `replacedBy`. Reuse detection: if a token that has already been rotated (has a
 * `replacedBy`) is presented again, the entire chain for that user is revoked — that pattern only
 * happens if a stolen token is used after the legitimate client already rotated past it.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    deviceLabel: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ip: {
      type: String,
      default: null,
    },
    expiresAt: {
      // Indexed below via schema.index() with a TTL — not also here, to avoid a duplicate index.
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    /** Set when this token was rotated into a new one — presenting this token again afterward
     * is reuse and triggers revoking the whole chain. */
    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RefreshToken',
      default: null,
    },
  },
  { timestamps: true }
);

// TTL: remove documents well after they've expired (grace period for support/forensics).
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
