const mongoose = require('mongoose');

/**
 * TOTP secret for a user (Chunk 10). One document per user — a fresh `setup` call overwrites the
 * pending (not-yet-`enabled`) secret rather than creating a second row, so an abandoned
 * enrollment attempt can't leave stale rows behind.
 *
 * `secret` is AES-256-GCM encrypted (see config/twoFactorEncryption.js) — never stored or logged
 * in plaintext.
 */
const twoFactorSecretSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    secret: {
      type: String,
      required: true,
      select: false,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    enabledAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TwoFactorSecret', twoFactorSecretSchema);
