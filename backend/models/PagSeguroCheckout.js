const mongoose = require('mongoose');

const WEBHOOK_EVENT_SCHEMA = new mongoose.Schema(
  {
    fingerprint: { type: String, required: true },
    type: { type: String },
    receivedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * Tracks PagBank Checkout sessions for Family Plan (Brazil).
 * Used for idempotency, audit, and success-page verification.
 */
const pagSeguroCheckoutSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      maxlength: 64,
    },
    pagbankCheckoutId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    childCount: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    addBox: {
      type: Boolean,
      default: false,
    },
    amountCents: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'BRL',
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'declined', 'expired', 'canceled', 'in_analysis', 'waiting'],
      default: 'pending',
      index: true,
    },
    termsVersion: {
      type: String,
    },
    payUrl: {
      type: String,
      select: false,
    },
    chargeIds: {
      type: [String],
      default: [],
    },
    paidAt: {
      type: Date,
    },
    webhookEvents: {
      type: [WEBHOOK_EVENT_SCHEMA],
      default: [],
    },
  },
  { timestamps: true }
);

pagSeguroCheckoutSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('PagSeguroCheckout', pagSeguroCheckoutSchema);
