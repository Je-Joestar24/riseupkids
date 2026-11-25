/**
 * Checkout service: config and Family Plan Stripe Checkout Session creation.
 *
 * What a family pays comes from the ONE price list (config/familyPlanPricing.js, via familyPlanPricing.service.js):
 * 1 to 4 children, annual, paid once. This file only maps "region + children" to the matching Stripe price id
 * (STRIPE_FAMILY_PLAN_PRICES from config/stripe.js, made by scripts/createStripePrices.js).
 * There is no activity box any more: nothing is added on top of the plan price, and a box field sent by an old app is ignored.
 */

const {
  stripe,
  STRIPE_FAMILY_PLAN_PRODUCT_ID,
  STRIPE_FAMILY_PLAN_PRICES,
} = require('../config/stripe');
const pricing = require('./familyPlanPricing.service');

const MIN_CHILDREN = pricing.MIN_CHILDREN;
const MAX_CHILDREN = pricing.MAX_CHILDREN;
const SUPPORTED_LOCALES = ['pt', 'en', 'es'];

// ACTIVITY BOX ADD-ON: SWITCHED OFF (the client no longer sells it). The code is kept here, commented out,
// so it can be switched on again. See docs/ACTIVITY_BOX_DISABLED.md for every place and how to re-enable it.
//
// /** Box price per child by region (br/us/eu) - same as frontend checkoutService */
// const BOX_PRICE_PER_CHILD = { br: 297, us: 99, eu: 99 };
//
// /** Currency by region for Stripe */
// const CURRENCY_BY_REGION = { br: 'brl', us: 'usd', eu: 'eur' };

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
 * The prices the checkout pages may show (annual; monthly only once it is switched on).
 * GET /api/checkout/pricing
 */
function getCheckoutPricing() {
  return pricing.getPublicPricing();
}

/**
 * Create a Stripe Checkout Session for Family Plan (one-time annual payment).
 *
 * @param {Object} options
 * @param {string} options.userId - Parent User ID (MongoDB ObjectId string).
 * @param {string} options.userEmail - Parent email (for Stripe customer_email or customer).
 * @param {string} options.region - 'br' | 'us' | 'eu'
 * @param {number|string} options.childCount - 1 to 4 (anything else is refused with a 400, never rounded)
 * @param {string} options.successUrl - Redirect after success (may include {CHECKOUT_SESSION_ID}).
 * @param {string} options.cancelUrl - Redirect on cancel.
 * @param {string} [options.termsVersion] - Terms version accepted (e.g. terms_v1_2026-02-10).
 * @returns {Promise<{ sessionId: string, url: string }>}
 * @throws {FamilyPlanPricingError} (400) for a bad region or child count
 */
async function createFamilyPlanCheckoutSession({
  userId,
  userEmail,
  region,
  childCount,
  successUrl,
  cancelUrl,
  termsVersion,
}) {
  // What the customer sent is checked first, so a bad request is a 400 whatever the server's own set-up is
  const regionKey = pricing.normalizeRegion(region);
  const count = pricing.normalizeChildCount(childCount);

  if (!stripe) {
    throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
  }

  if (!STRIPE_FAMILY_PLAN_PRODUCT_ID || !STRIPE_FAMILY_PLAN_PRICES) {
    throw new Error('Family Plan prices not configured for this Stripe key (live and test have separate prices). Run scripts/createStripePrices.js so config/stripeFamilyPlanPrices.live.json (live key) or .test.json (test key) exists.');
  }

  // Own properties only, so a made-up name can never reach an inherited value
  const regionPrices = Object.prototype.hasOwnProperty.call(STRIPE_FAMILY_PLAN_PRICES, regionKey)
    ? STRIPE_FAMILY_PLAN_PRICES[regionKey]
    : null;
  const priceId = regionPrices && (regionPrices[count] || regionPrices[String(count)]);
  if (!priceId) {
    throw new Error(`No Stripe price found for region=${regionKey}, kids=${count}. Run scripts/createStripePrices.js, then npm run stripe:verify-prices.`);
  }

  // ACTIVITY BOX ADD-ON: SWITCHED OFF (the client no longer sells it). The code is kept here, commented out,
// so it can be switched on again. See docs/ACTIVITY_BOX_DISABLED.md for every place and how to re-enable it.
  // To re-enable: add `addBox = false` to the options of this function, build `lineItems` (the plan price, then this),
  // use it as `line_items`, and add `addBox: addBox ? '1' : '0'` to the metadata:
  //
  //   const lineItems = [{ price: priceId, quantity: 1 }];
  //   if (addBox) {
  //     const currency = CURRENCY_BY_REGION[region];
  //     const perChild = BOX_PRICE_PER_CHILD[region] ?? 99;
  //     const boxTotalCents = perChild * count * 100;
  //     lineItems.push({
  //       price_data: {
  //         currency,
  //         product_data: {
  //           name: 'Family Plan – Activity Box',
  //           description: `${count} box(es) (${count} child${count > 1 ? 'ren' : ''})`,
  //         },
  //         unit_amount: boxTotalCents,
  //       },
  //       quantity: 1,
  //     });
  //   }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      familyPlan: '1',
      region: regionKey,
      childCount: String(count),
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
  getCheckoutPricing,
  createFamilyPlanCheckoutSession,
  MIN_CHILDREN,
  MAX_CHILDREN,
};
