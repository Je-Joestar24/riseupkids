const mongoose = require('mongoose');

const notificationReceiptSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotificationCampaign',
      required: true,
      index: true,
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
    },
    isTest: {
      type: Boolean,
      default: false,
      index: true,
    },
    languageCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    fallbackUsed: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    imageMediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    destination: {
      kind: { type: String, trim: true },
      contentId: { type: String, default: null, trim: true },
    },
    pushResult: {
      type: String,
      enum: ['queued', 'sent', 'failed', 'skipped'],
      default: 'queued',
    },
    failureReason: {
      type: String,
      default: null,
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationReceiptSchema.index({ campaign: 1, userId: 1, isTest: 1 });

module.exports = mongoose.model('NotificationReceipt', notificationReceiptSchema);
