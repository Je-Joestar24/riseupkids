const mongoose = require('mongoose');

/**
 * GoogleIntegration Model
 * 
 * Stores OAuth tokens for teachers/admins who connect their Google accounts
 * Used for creating and managing Google Meet meetings
 */
const googleIntegrationSchema = new mongoose.Schema(
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
googleIntegrationSchema.index({ user: 1 }, { unique: true });
googleIntegrationSchema.index({ expiryDate: 1 });

/**
 * Check if token is expired
 * @returns {Boolean}
 */
googleIntegrationSchema.methods.isTokenExpired = function () {
  return new Date() >= this.expiryDate;
};

/**
 * Check if token expires soon (within 5 minutes)
 * @returns {Boolean}
 */
googleIntegrationSchema.methods.isTokenExpiringSoon = function () {
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return this.expiryDate <= fiveMinutesFromNow;
};

module.exports = mongoose.model('GoogleIntegration', googleIntegrationSchema);
