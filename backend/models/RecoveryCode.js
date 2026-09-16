const mongoose = require('mongoose');

/**
 * Single-use 2FA recovery codes (Chunk 10). Generated in a batch of 10 when TOTP enrollment
 * completes; each stored as a SHA-256 hash (like a password-reset code, never the plaintext) and
 * consumed exactly once. Regenerating the batch (from settings, or after enrollment) deletes the
 * previous batch first — old codes shown on screen once become worthless immediately.
 */
const recoveryCodeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

recoveryCodeSchema.index({ userId: 1, codeHash: 1 });

module.exports = mongoose.model('RecoveryCode', recoveryCodeSchema);
