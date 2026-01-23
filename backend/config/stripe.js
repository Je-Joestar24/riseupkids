const stripeLib = require('stripe');

/**
 * Stripe configuration
 *
 * Phase 1: basic Stripe instance + useful env exports.
 * Later phases can extend this with helpers as needed.
 */

if (!process.env.STRIPE_SECRET_KEY) {
  // We intentionally don't throw here to avoid crashing in non-Stripe flows.
  // Stripe-dependent controllers/services should check and fail gracefully.
  console.warn('[Stripe] STRIPE_SECRET_KEY is not set. Stripe features will be disabled.');
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? stripeLib(process.env.STRIPE_SECRET_KEY)
  : null;

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRODUCT_ID = process.env.STRIPE_PRODUCT_ID || '';
const STRIPE_PRICE_ID_YEARLY = process.env.STRIPE_PRICE_ID_YEARLY || '';

module.exports = {
  stripe,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRODUCT_ID,
  STRIPE_PRICE_ID_YEARLY,
};
