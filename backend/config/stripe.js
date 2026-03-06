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

/** Family Plan: product ID + price IDs by region (br/us/eu) and kids (1–10). Populated by scripts/createStripePrices.js */
let STRIPE_FAMILY_PLAN_PRODUCT_ID = '';
let STRIPE_FAMILY_PLAN_PRICES = { br: {}, us: {}, eu: {} };
try {
  const path = require('path');
  const fs = require('fs');
  const configPath = path.join(__dirname, 'stripeFamilyPlanPrices.json');
  if (fs.existsSync(configPath)) {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    STRIPE_FAMILY_PLAN_PRODUCT_ID = data.productId || '';
    STRIPE_FAMILY_PLAN_PRICES = data.prices || STRIPE_FAMILY_PLAN_PRICES;
  }
} catch (err) {
  console.warn('[Stripe] Could not load stripeFamilyPlanPrices.json:', err.message);
}

module.exports = {
  stripe,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRODUCT_ID,
  STRIPE_PRICE_ID_YEARLY,
  STRIPE_FAMILY_PLAN_PRODUCT_ID,
  STRIPE_FAMILY_PLAN_PRICES,
};
