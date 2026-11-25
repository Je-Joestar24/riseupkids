/**
 * Family Plan pricing service: pure functions over config/familyPlanPricing.js. No network, no database, no env.
 * Every payment provider and the public pricing endpoint go through this, so there is one way to read a price.
 *
 * Refusals are errors with a stable `code` (never a silent clamp: a request for 5 children must not be sold as 4):
 *   INVALID_CHILD_COUNT, INVALID_REGION_OR_CURRENCY, MONTHLY_NOT_AVAILABLE
 */

const pricing = require('../config/familyPlanPricing');

/**
 * A refusal the customer (or an old app) caused: a bad child count, region or currency, or monthly before it opens.
 * It is a 400, never a 500: `statusCode` makes the central error handler answer 400, and `publicCode` (the same short
 * code) is the only code it is allowed to send back (see middleware/errorHandler.js).
 */
class FamilyPlanPricingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'FamilyPlanPricingError';
    this.code = code;
    this.publicCode = code;
    this.statusCode = 400;
  }
}

const CURRENCIES = Object.freeze([...new Set(Object.values(pricing.REGION_CURRENCY))]);
const REGIONS = Object.freeze(Object.keys(pricing.REGION_CURRENCY));

/** 1..MAX_CHILDREN, in order. */
const childCounts = () => Array.from({ length: pricing.MAX_CHILDREN - pricing.MIN_CHILDREN + 1 }, (_, i) => pricing.MIN_CHILDREN + i);

/**
 * A child count as a whole number from MIN to MAX. Accepts a number or a plain digit string ("3").
 * Refuses everything else: 0, 5, 2.5, NaN, null, "", "3 kids", true, arrays.
 */
function normalizeChildCount(value) {
  let n = value;
  // A plain whole number written without leading zeros ("3"); "03", "0004", "1e1", "3 kids" are not accepted
  if (typeof value === 'string' && /^(0|[1-9]\d{0,2})$/.test(value.trim())) n = Number(value.trim());
  if (typeof n !== 'number' || !Number.isInteger(n) || n < pricing.MIN_CHILDREN || n > pricing.MAX_CHILDREN) {
    throw new FamilyPlanPricingError(
      'INVALID_CHILD_COUNT',
      `Child count must be a whole number from ${pricing.MIN_CHILDREN} to ${pricing.MAX_CHILDREN}.`
    );
  }
  return n;
}

/** "BRL" | "brl" | "br" | "BR" -> "BRL". Throws for anything that is not one of our regions or currencies. */
function resolveCurrency(regionOrCurrency) {
  if (typeof regionOrCurrency === 'string') {
    const key = regionOrCurrency.trim();
    if (Object.prototype.hasOwnProperty.call(pricing.REGION_CURRENCY, key.toLowerCase())) {
      return pricing.REGION_CURRENCY[key.toLowerCase()];
    }
    if (CURRENCIES.includes(key.toUpperCase())) return key.toUpperCase();
  }
  throw new FamilyPlanPricingError(
    'INVALID_REGION_OR_CURRENCY',
    `Unknown region or currency. Use one of: ${[...REGIONS, ...CURRENCIES].join(', ')}.`
  );
}

/**
 * A region exactly as the apps send it: "br", "us" or "eu" (case and spaces ignored).
 * Unlike resolveCurrency, a currency code is NOT accepted here.
 */
function normalizeRegion(value) {
  const key = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!REGIONS.includes(key)) {
    throw new FamilyPlanPricingError('INVALID_REGION_OR_CURRENCY', `Invalid region. Use one of: ${REGIONS.join(', ')}.`);
  }
  return key;
}

/** "BRL" -> "br". */
function regionForCurrency(currency) {
  const code = resolveCurrency(currency);
  return REGIONS.find((region) => pricing.REGION_CURRENCY[region] === code);
}

/** Annual price for the whole family, in cents/centavos. */
function getAnnualCents(regionOrCurrency, kids) {
  const currency = resolveCurrency(regionOrCurrency);
  return pricing.ANNUAL_CENTS[currency][normalizeChildCount(kids)];
}

/**
 * Monthly price for the whole family, in cents/centavos.
 * Refused while MONTHLY_ENABLED is false. Setup scripts that prepare future monthly prices pass { ignoreSwitch: true }.
 */
function getMonthlyCents(regionOrCurrency, kids, { ignoreSwitch = false } = {}) {
  if (!pricing.MONTHLY_ENABLED && !ignoreSwitch) {
    throw new FamilyPlanPricingError('MONTHLY_NOT_AVAILABLE', 'The monthly payment option is not available yet.');
  }
  const currency = resolveCurrency(regionOrCurrency);
  return pricing.MONTHLY_CENTS[currency][normalizeChildCount(kids)];
}

/** 69900 -> "699.00" (what PayPal wants). */
function centsToMajorString(cents) {
  if (!Number.isInteger(cents) || cents < 0) throw new TypeError('cents must be a whole number of 0 or more');
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

const isMonthlyEnabled = () => pricing.MONTHLY_ENABLED;

/**
 * Every price cell, in a stable order: one entry per region x kids x interval.
 * Monthly cells are included only when asked (setup and checking scripts); the public view never lists them while closed.
 */
function listPriceCells({ includeMonthly = false } = {}) {
  const cells = [];
  for (const region of REGIONS) {
    const currency = pricing.REGION_CURRENCY[region];
    for (const kids of childCounts()) {
      cells.push({ region, currency, kids, interval: 'annual', cents: pricing.ANNUAL_CENTS[currency][kids] });
      if (includeMonthly) {
        cells.push({ region, currency, kids, interval: 'monthly', cents: pricing.MONTHLY_CENTS[currency][kids] });
      }
    }
  }
  return cells;
}

/**
 * What the checkout pages are allowed to see (GET /api/checkout/pricing).
 * Monthly appears here only when MONTHLY_ENABLED is true.
 */
function getPublicPricing() {
  const regions = {};
  for (const region of REGIONS) {
    const currency = pricing.REGION_CURRENCY[region];
    const plans = childCounts().map((kids) => {
      const plan = { children: kids, annualCents: pricing.ANNUAL_CENTS[currency][kids] };
      if (pricing.MONTHLY_ENABLED) plan.monthlyCents = pricing.MONTHLY_CENTS[currency][kids];
      return plan;
    });
    regions[region] = { currency, plans };
  }
  const result = { minChildren: pricing.MIN_CHILDREN, maxChildren: pricing.MAX_CHILDREN, regions };
  if (pricing.MONTHLY_ENABLED) result.monthlyPayments = pricing.MONTHLY_PAYMENTS;
  return result;
}

module.exports = {
  FamilyPlanPricingError,
  MIN_CHILDREN: pricing.MIN_CHILDREN,
  MAX_CHILDREN: pricing.MAX_CHILDREN,
  MONTHLY_PAYMENTS: pricing.MONTHLY_PAYMENTS,
  CURRENCIES,
  REGIONS,
  childCounts,
  normalizeChildCount,
  resolveCurrency,
  normalizeRegion,
  regionForCurrency,
  getAnnualCents,
  getMonthlyCents,
  centsToMajorString,
  isMonthlyEnabled,
  listPriceCells,
  getPublicPricing,
};
