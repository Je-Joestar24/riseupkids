const mongoose = require('mongoose');

/**
 * Tracks self-service deletion requests from parents.
 * Access is revoked immediately; data purge is completed by admin/script.
 */
const accountDeletionRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['parent_account', 'child_profile'],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChildProfile',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    processingStartedAt: {
      type: Date,
      default: null,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    scheduledPurgeAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    requesterIp: {
      type: String,
      default: null,
    },
    subscriptionNotes: {
      type: String,
      default: null,
    },
    purgeSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

accountDeletionRequestSchema.index({ status: 1, scheduledPurgeAt: 1 });
accountDeletionRequestSchema.index(
  { userId: 1, childId: 1, type: 1, status: 1 },
  { name: 'deletion_request_lookup' }
);

module.exports = mongoose.model('AccountDeletionRequest', accountDeletionRequestSchema);
