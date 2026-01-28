const mongoose = require('mongoose');

/**
 * YouTubeIntegration Model
 * 
 * Stores OAuth tokens for teachers/admins who connect their YouTube accounts
 * Used for creating and managing YouTube Live streams
 */
const youtubeIntegrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      unique: true,
      index: true,
    },
    accessToken: {
      type: String,
      required: [true, 'Access token is required'],
    },
    refreshToken: {
      type: String,
      required: [true, 'Refresh token is required'],
    },
    scope: {
      type: String,
      required: [true, 'Scope is required'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true,
    },
    connectedEmail: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
youtubeIntegrationSchema.index({ user: 1 }, { unique: true });
youtubeIntegrationSchema.index({ expiryDate: 1 });

/**
 * Check if token is expired
 * @returns {Boolean}
 */
youtubeIntegrationSchema.methods.isTokenExpired = function () {
  return new Date() >= this.expiryDate;
};

/**
 * Check if token expires soon (within 5 minutes)
 * @returns {Boolean}
 */
youtubeIntegrationSchema.methods.isTokenExpiringSoon = function () {
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return this.expiryDate <= fiveMinutesFromNow;
};

module.exports = mongoose.model('YouTubeIntegration', youtubeIntegrationSchema);
