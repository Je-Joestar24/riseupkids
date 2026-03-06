/**
 * Checkout service: config and Family Plan Stripe Checkout Session creation.
 * Uses STRIPE_FAMILY_PLAN_PRICES from config/stripe.js.
 */

const {
  stripe,
  STRIPE_FAMILY_PLAN_PRODUCT_ID,
  STRIPE_FAMILY_PLAN_PRICES,
} = require('../config/stripe');

const MIN_CHILDREN = 1;
const MAX_CHILDREN = 10;
const SUPPORTED_LOCALES = ['pt', 'en', 'es'];

/** Box price per child by region (br/us/eu) - same as frontend checkoutService */
const BOX_PRICE_PER_CHILD = { br: 297, us: 99, eu: 99 };

/** Currency by region for Stripe */
const CURRENCY_BY_REGION = { br: 'brl', us: 'usd', eu: 'eur' };

/**
 * Get checkout config for the sale app (min/max children, supported locales).
 * @returns {{ minChildren: number, maxChildren: number, supportedLocales: string[] }}
 */
function getCheckoutConfig() {
  return {
    minChildren: MIN_CHILDREN,
    maxChildren: MAX_CHILDREN,
    supportedLocales: SUPPORTED_LOCALES,
  };
}

/**
 * Create a Stripe Checkout Session for Family Plan (one-time payment).
 *
 * @param {Object} options
 * @param {string} options.userId - Parent User ID (MongoDB ObjectId string).
 * @param {string} options.userEmail - Parent email (for Stripe customer_email or customer).
 * @param {string} options.region - 'br' | 'us' | 'eu'
 * @param {number} options.childCount - 1–10
 * @param {boolean} [options.addBox=false] - Include activity box line item.
 * @param {string} options.successUrl - Redirect after success (may include {CHECKOUT_SESSION_ID}).
 * @param {string} options.cancelUrl - Redirect on cancel.
 * @param {string} [options.termsVersion] - Terms version accepted (e.g. terms_v1_2026-02-10).
 * @returns {Promise<{ sessionId: string, url: string }>}
 */
async function createFamilyPlanCheckoutSession({
  userId,
  userEmail,
  region,
  childCount,
  addBox = false,
  successUrl,
  cancelUrl,
  termsVersion,
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
  }

  if (!STRIPE_FAMILY_PLAN_PRODUCT_ID || !STRIPE_FAMILY_PLAN_PRICES) {
    throw new Error('Family Plan prices not configured. Run scripts/createStripePrices.js and ensure config/stripeFamilyPlanPrices.json exists.');
  }

  const regionPrices = STRIPE_FAMILY_PLAN_PRICES[region];
  if (!regionPrices) {
    throw new Error(`Invalid region: ${region}. Use br, us, or eu.`);
  }

  const count = Math.min(MAX_CHILDREN, Math.max(MIN_CHILDREN, Number(childCount) || 1));
  const priceId = regionPrices[count] || regionPrices[String(count)];
  if (!priceId) {
    throw new Error(`No price found for region=${region}, kids=${count}.`);
  }

  const lineItems = [
    {
      price: priceId,
      quantity: 1,
    },
  ];

  if (addBox) {
    const currency = CURRENCY_BY_REGION[region];
    const perChild = BOX_PRICE_PER_CHILD[region] ?? 99;
    const boxTotalCents = perChild * count * 100;
    lineItems.push({
      price_data: {
        currency,
        product_data: {
          name: 'Family Plan – Activity Box',
          description: `${count} box(es) (${count} child${count > 1 ? 'ren' : ''})`,
        },
        unit_amount: boxTotalCents,
      },
      quantity: 1,
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: userEmail,
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      familyPlan: '1',
      region,
      childCount: String(count),
      addBox: addBox ? '1' : '0',
      ...(termsVersion ? { terms_version: termsVersion } : {}),
    },
  });

  return {
    sessionId: session.id,
    url: session.url,
  };
}

module.exports = {
  getCheckoutConfig,
  createFamilyPlanCheckoutSession,
  MIN_CHILDREN,
  MAX_CHILDREN,
};
