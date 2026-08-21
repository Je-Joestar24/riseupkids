const mongoose = require('mongoose');

const devicePushTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['ios', 'android'],
      required: true,
    },
    token: {
      type: String,
      required: true,
      trim: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    invalid: {
      type: Boolean,
      default: false,
      index: true,
    },
    invalidReason: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

devicePushTokenSchema.index({ userId: 1, token: 1 }, { unique: true });
devicePushTokenSchema.index({ token: 1 });

module.exports = mongoose.model('DevicePushToken', devicePushTokenSchema);
