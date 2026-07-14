const mongoose = require('mongoose');

/**
 * Singleton lock document to prevent concurrent deletion scheduler runs
 * across multiple API instances. _id is always 'deletion-scheduler'.
 */
const deletionSchedulerLockSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'deletion-scheduler',
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lockedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    _id: false,
  }
);

module.exports = mongoose.model('DeletionSchedulerLock', deletionSchedulerLockSchema);
