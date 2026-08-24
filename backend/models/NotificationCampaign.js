const mongoose = require('mongoose');
const { NOTIFICATION_AUDIENCES, NOTIFICATION_STATUSES } = require('../config/notificationCatalog');

const audienceValues = NOTIFICATION_AUDIENCES.map((item) => item.value);

const localizationSchema = new mongoose.Schema(
  {
    languageCode: {
      type: String,
      required: [true, 'Localization language code is required'],
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: [true, 'Push title is required'],
      trim: true,
      maxlength: [120, 'Push title cannot exceed 120 characters'],
    },
    message: {
      type: String,
      required: [true, 'Push message is required'],
      trim: true,
      maxlength: [500, 'Push message cannot exceed 500 characters'],
    },
    imageMediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Media',
      default: null,
    },
  },
  { _id: false }
);

const destinationSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      required: [true, 'Destination kind is required'],
      trim: true,
    },
    contentId: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { _id: false }
);

const notificationCampaignSchema = new mongoose.Schema(
  {
    internalName: {
      type: String,
      required: [true, 'Internal name is required'],
      trim: true,
      maxlength: [200, 'Internal name cannot exceed 200 characters'],
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      trim: true,
    },
    audience: {
      type: String,
      required: [true, 'Audience is required'],
      enum: audienceValues,
    },
    destination: {
      type: destinationSchema,
      required: [true, 'Destination is required'],
    },
    fallbackLanguage: {
      type: String,
      default: 'en',
      trim: true,
      lowercase: true,
    },
    localizations: {
      type: [localizationSchema],
      default: [],
    },
    status: {
      type: String,
      enum: NOTIFICATION_STATUSES,
      default: 'draft',
    },
    sendAt: {
      type: Date,
      default: null,
    },
    timezone: {
      type: String,
      default: null,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    sendLocalDate: {
      type: String,
      default: null,
      trim: true,
    },
    sendLocalTime: {
      type: String,
      default: null,
      trim: true,
    },
    timingMode: {
      type: String,
      enum: ['recipient_local', 'same_moment'],
      default: 'same_moment',
    },
    quietHourBehavior: {
      type: String,
      enum: ['defer', 'expire'],
      default: 'defer',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    expiresLocalDate: {
      type: String,
      default: null,
      trim: true,
    },
    expiresLocalTime: {
      type: String,
      default: null,
      trim: true,
    },
    lastError: {
      type: String,
      default: null,
      trim: true,
    },
    delivery: {
      targeted: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      expired: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

notificationCampaignSchema.index({ status: 1, createdAt: -1 });
notificationCampaignSchema.index({ type: 1, status: 1 });
notificationCampaignSchema.index({ status: 1, sendAt: 1 });

module.exports = mongoose.model('NotificationCampaign', notificationCampaignSchema);
