/**
 * Family Plan pricing for the parents' subscription screen.
 *
 * There are NO price numbers in this file: the prices come from the backend (GET /api/checkout/pricing, the one
 * price list that Stripe, PayPal and PagBank also charge from). This file only checks the answer, formats it and
 * works out the saving. (Same logic as riseupkids-sale/web/src/services/pricing.js.)
 *
 * Shape of the backend answer (annual prices, whole cents; monthly is never in it while the option is closed):
 *   { minChildren, maxChildren, regions: { br: { currency: 'BRL', plans: [{ children: 1, annualCents: ... }, ...] }, us: {...}, eu: {...} } }
 */

import api from '../api/axios';

export const MIN_CHILDREN = 1;

const REGIONS = ['br', 'us', 'eu'];
const CURRENCIES = { br: 'BRL', us: 'USD', eu: 'EUR' };
const LOCALE_REGION = { pt: 'br', en: 'us', es: 'eu' };

/** Region (br/us/eu) → display locale (pt/en/es) */
export function regionToLocale(region) {
  const map = { br: 'pt', us: 'en', eu: 'es' };
  return map[region] || 'en';
}

const isWholeNumber = (value) => typeof value === 'number' && Number.isInteger(value);

/**
 * Validates the backend answer and returns it unchanged, or throws. A wrong or half-loaded answer is an error
 * (no price is shown), never a guess.
 * @throws {Error}
 */
export function normalizePricingResponse(data) {
  const fail = (why) => {
    throw new Error(`Prices could not be read (${why}).`);
  };
  if (!data || typeof data !== 'object') fail('no answer');
  const { minChildren, maxChildren, regions } = data;
  if (!isWholeNumber(minChildren) || !isWholeNumber(maxChildren) || minChildren < 1 || maxChildren < minChildren) {
    fail('bad child limits');
  }
  if (!regions || typeof regions !== 'object') fail('no regions');

  for (const region of REGIONS) {
    const entry = regions[region];
    if (!entry || typeof entry !== 'object') fail(`missing ${region}`);
    if (entry.currency !== CURRENCIES[region]) fail(`wrong currency for ${region}`);
    if (!Array.isArray(entry.plans) || entry.plans.length !== maxChildren - minChildren + 1) fail(`wrong number of plans for ${region}`);
    entry.plans.forEach((plan, index) => {
      if (!plan || plan.children !== minChildren + index) fail(`plans for ${region} are not in order`);
      if (!isWholeNumber(plan.annualCents) || plan.annualCents < 1) fail(`bad price for ${region} ${plan.children}`);
    });
  }
  return data;
}

/** Fetch the prices from the backend (public) and check them. Rejects when the answer is missing or broken. */
export async function fetchCheckoutPricing() {
  const res = await api.get('/checkout/pricing');
  return normalizePricingResponse(res?.data);
}

/** The plan for this display locale and number of children, or null (not loaded, or a size that is not sold). */
export function findPlan(pricing, locale, childCount) {
  const entry = pricing?.regions?.[LOCALE_REGION[locale] || LOCALE_REGION.en];
  return entry?.plans?.find((plan) => plan.children === childCount) ?? null;
}

function groupingFor(locale) {
  if (locale === 'pt') return { tag: 'pt-BR', symbol: 'R$', useGrouping: false }; // R$1299, not R$1.299
  if (locale === 'es') return { tag: 'de-DE', symbol: '€', useGrouping: true }; // €1.598
  return { tag: 'en-US', symbol: '$', useGrouping: true }; // $1,598
}

/** 69900 -> "R$699" (pt), 12000 -> "$120" (en), 12000 -> "€120" (es). Shows cents only when there are any. */
export function formatPrice(cents, locale) {
  if (!isWholeNumber(cents) || cents < 0) return '';
  const { tag, symbol, useGrouping } = groupingFor(locale);
  const hasCents = cents % 100 !== 0;
  const text = (cents / 100).toLocaleString(tag, {
    useGrouping,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${symbol}${text}`;
}

/** What a plan saves compared with buying 1-child plans one by one, from the backend's own numbers (null for 1 child or no saving). */
export function getSaving(pricing, locale, childCount) {
  if (childCount <= 1) return null;
  const single = findPlan(pricing, locale, 1);
  const plan = findPlan(pricing, locale, childCount);
  if (!single || !plan) return null;
  const separate = single.annualCents * childCount;
  const savedCents = separate - plan.annualCents;
  if (savedCents <= 0) return null;
  return { savedCents, percent: Math.round((savedCents / separate) * 100) };
}

/**
 * Plan pricing for display, from the backend prices.
 * @param {object|null} pricing - the backend answer (null while it is not loaded)
 * @param {string} locale - 'pt' | 'en' | 'es'
 * @param {number} childCount
 * @returns {{ line1: string, line2: null, amount: number, discountFormatted?: string } | null}
 *   null while there are no prices or for a size that is not sold: the screen then shows no price at all.
 */
export function getPlanPricing(pricing, locale, childCount) {
  const plan = findPlan(pricing, locale, childCount);
  if (!plan) return null;
  const out = {
    line1: formatPrice(plan.annualCents, locale),
    line2: null,
    amount: plan.annualCents / 100,
  };
  // The saving line has always been shown for the Portuguese (Brazil) plans only; it is now worked out from the backend prices
  if (locale === 'pt') {
    const saving = getSaving(pricing, locale, childCount);
    if (saving) {
      out.discountPercent = saving.percent;
      out.discountAmount = saving.savedCents / 100;
      out.discountFormatted = `Economize ${saving.percent}% (${formatPrice(saving.savedCents, 'pt')})`;
    }
  }
  return out;
}

/** Human-readable children label for plan summary */
export function getChildrenPlanLabel(childCount) {
  const count = Math.max(MIN_CHILDREN, Math.floor(Number(childCount)) || MIN_CHILDREN);
  if (count === 1) return '1 Child';
  if (count === 2) return '2 Children';
  return `${count} Children`;
}

/** Benefits included in Family Plan (matches sale checkout summary) */
export const FAMILY_PLAN_BENEFITS = [
  '12 months of program access',
  'Live classes',
  'Weekly Storytime',
  'Interactive activities',
  'Structured immersion curriculum',
  'Safe community for children',
];

/** Payment note when line2 is not set (every region now) */
export const PAYMENT_NOTE = 'or flexible payment options available at checkout';
