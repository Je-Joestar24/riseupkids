const mongoose = require('mongoose');

/**
 * YouTubeIntegration Model
 * 
 * Stores OAuth tokens for centralized YouTube account connection
 * Single admin account manages the LMS YouTube channel
 * All teachers use this account to create streams
 */
const youtubeIntegrationSchema = new mongoose.Schema(
  {
    // Single integration for the entire system (not per-user)
    // Use a fixed identifier to ensure only one integration exists
    integrationType: {
      type: String,
      default: 'admin',
      enum: ['admin'],
      required: true,
    },
    // Store which admin user set up the connection (for reference)
    setupBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional, for tracking
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
youtubeIntegrationSchema.index({ integrationType: 1 }, { unique: true });
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
