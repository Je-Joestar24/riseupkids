const mongoose = require('mongoose');

const notificationSchedulerLockSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'notification-scheduler',
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

module.exports = mongoose.model('NotificationSchedulerLock', notificationSchedulerLockSchema);
