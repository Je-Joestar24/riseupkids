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

// Chunk 8 — startup assertion. Kept as a warning (not a boot-time throw) to match the rest of
// this file: Stripe is an optional payment provider (PayPal/PagBank cover the same feature), so
// a deployment that doesn't use Stripe at all must still boot cleanly. But if STRIPE_SECRET_KEY
// IS set, a missing webhook secret is a real misconfiguration — surface it immediately at boot
// instead of only discovering it the first time a real webhook 500s in production.
if (stripe && !STRIPE_WEBHOOK_SECRET) {
  console.warn(
    '[Stripe] STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is missing — POST /api/stripe/webhook ' +
      'will reject every request with a 500 until this is set. Get it from the Stripe Dashboard ' +
      '(Developers > Webhooks) or `stripe listen --forward-to localhost:5000/api/stripe/webhook`.'
  );
}
const STRIPE_PRODUCT_ID = process.env.STRIPE_PRODUCT_ID || '';
const STRIPE_PRICE_ID_YEARLY = process.env.STRIPE_PRICE_ID_YEARLY || '';

/**
 * Family Plan: product ID + price IDs by region (br/us/eu) and kids. Populated by scripts/createStripePrices.js.
 * The file is chosen by the KIND of key: a live key reads stripeFamilyPlanPrices.live.json only, a test key reads
 * stripeFamilyPlanPrices.test.json (see config/stripeFamilyPlanFile.js). Test and live prices are separate in Stripe,
 * so a live key must never be given test price ids ("No such price").
 */
const { loadFamilyPlanConfig, keyMode } = require('./stripeFamilyPlanFile');

const STRIPE_KEY_MODE = keyMode(process.env.STRIPE_SECRET_KEY);
const familyPlan = loadFamilyPlanConfig({ secretKey: process.env.STRIPE_SECRET_KEY });
const STRIPE_FAMILY_PLAN_PRODUCT_ID = familyPlan.productId;
const STRIPE_FAMILY_PLAN_PRICES = familyPlan.prices;
if (familyPlan.error && stripe) {
  console.warn(`[Stripe] ${familyPlan.error}`);
}

module.exports = {
  stripe,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRODUCT_ID,
  STRIPE_PRICE_ID_YEARLY,
  STRIPE_KEY_MODE,
  STRIPE_FAMILY_PLAN_PRODUCT_ID,
  STRIPE_FAMILY_PLAN_PRICES,
};
