const mongoose = require('mongoose');

/**
 * Stores processed PayPal webhook event IDs for idempotency (mirrors StripeWebhookEvent.js).
 * PayPal may deliver the same event more than once; each event.id is processed only once.
 * TTL index auto-deletes records after 30 days to avoid unbounded growth.
 */
const paypalWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true }
);

// TTL: remove documents 30 days after processedAt.
paypalWebhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('PayPalWebhookEvent', paypalWebhookEventSchema);
