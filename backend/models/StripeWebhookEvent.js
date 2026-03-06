const mongoose = require('mongoose');

/**
 * Stores processed Stripe webhook event IDs for idempotency.
 * Stripe may deliver the same event more than once; we process each event.id only once.
 * TTL index auto-deletes records after 30 days to avoid unbounded growth.
 */
const stripeWebhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
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

// TTL: remove documents 30 days after processedAt (Stripe recommends keeping for at least 24–48h)
stripeWebhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('StripeWebhookEvent', stripeWebhookEventSchema);
