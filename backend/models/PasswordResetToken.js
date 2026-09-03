const mongoose = require('mongoose');

/**
 * Password reset token – 6-digit code, 1-minute expiry, one-time use.
 * Used for forgot-password flow: create on request, validate on reset, delete on success.
 */
const passwordResetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    /** Wrong-code guesses against this token (RUK-SEC-007). The token is destroyed once this hits the cap. */
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

passwordResetTokenSchema.index({ userId: 1, expiresAt: 1 });

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
