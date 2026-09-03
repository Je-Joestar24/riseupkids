const mongoose = require('mongoose');

/**
 * Admin login OTP – 6-digit code, short expiry, one-time use.
 * Issued after successful password check for role === 'admin'; JWT is only
 * returned after this code is verified.
 */
const loginOtpTokenSchema = new mongoose.Schema(
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

loginOtpTokenSchema.index({ userId: 1, expiresAt: 1 });

module.exports = mongoose.model('LoginOtpToken', loginOtpTokenSchema);
