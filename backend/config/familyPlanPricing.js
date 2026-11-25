/**
 * Family Plan pricing: THE one price list. Stripe, PayPal and PagBank must all charge from here
 * (the checkout pages show what the backend returns from GET /api/checkout/pricing; they keep no numbers of their own).
 *
 * Rules
 * - Whole minor units only (cents / centavos), as integers. Never decimals.
 * - 1 to 4 children per family (MAX_CHILDREN).
 * - Annual = paid once, upfront. Monthly = 12 payments. Monthly prices are kept here ready for later, but customers
 *   cannot buy them while MONTHLY_ENABLED is false.
 * - The activity box add-on no longer exists. Nothing is added on top of the plan price.
 * - PagBank only works for Brazil, so it only ever reads BRL.
 *
 * Source: the client's pricing sheet. To change a price, change it HERE and in the test that holds the sheet
 * (tests/familyPlanPricing.test.js); the consistency check (npm run pricing:check) then shows every place that is out of date.
 * Stripe prices cannot be edited afterwards: a changed amount means creating a new Stripe price (scripts/createStripePrices.js).
 */

const MIN_CHILDREN = 1;
const MAX_CHILDREN = 4;

/** Monthly is stored but closed. Flip to true only when the checkout screens and providers are ready for it. */
const MONTHLY_ENABLED = false;

/** How many payments make up the monthly option. */
const MONTHLY_PAYMENTS = 12;

/** Region (used by the app and Stripe) -> currency. */
const REGION_CURRENCY = { br: 'BRL', us: 'USD', eu: 'EUR' };

/** Annual price for the whole family, paid once. */
const ANNUAL_CENTS = {
  USD: { 1: 12000, 2: 19000, 3: 25000, 4: 31000 },
  EUR: { 1: 12000, 2: 19000, 3: 25000, 4: 31000 },
  BRL: { 1: 69900, 2: 129900, 3: 179900, 4: 219900 },
};

/** Price per month for the whole family, when paying in 12 monthly payments. */
const MONTHLY_CENTS = {
  USD: { 1: 1200, 2: 1900, 3: 2500, 4: 3100 },
  EUR: { 1: 1200, 2: 1900, 3: 2500, 4: 3100 },
  BRL: { 1: 7000, 2: 13000, 3: 18000, 4: 22000 },
};

const deepFreeze = (value) => {
  Object.values(value).forEach((inner) => {
    if (inner && typeof inner === 'object') deepFreeze(inner);
  });
  return Object.freeze(value);
};

module.exports = deepFreeze({
  MIN_CHILDREN,
  MAX_CHILDREN,
  MONTHLY_ENABLED,
  MONTHLY_PAYMENTS,
  REGION_CURRENCY,
  ANNUAL_CENTS,
  MONTHLY_CENTS,
});
