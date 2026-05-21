/**
 * Family Plan pricing (aligned with riseupkids-sale checkoutService).
 * Used for parents subscription settings display.
 */

export const MIN_CHILDREN = 1;
export const MAX_CHILDREN = 10;

const PLAN_PRICES_BR = {
  1: { installment: '12x R$74,90', cash: 799, amount: 799, discountPercent: null, discountAmount: null },
  2: { installment: '12x R$122,90', cash: 1299, amount: 1299, discountPercent: 21, discountAmount: 299 },
  3: { installment: '12x R$169,90', cash: 1799, amount: 1799, discountPercent: 30, discountAmount: 598 },
  4: { installment: '12x R$205,90', cash: 2199, amount: 2199, discountPercent: 31, discountAmount: 997 },
  5: { installment: '12x R$219,92', cash: 2639, amount: 2639, discountPercent: 34, discountAmount: 1356 },
  6: { installment: '12x R$256,59', cash: 3079, amount: 3079, discountPercent: 36, discountAmount: 1715 },
  7: { installment: '12x R$293,25', cash: 3519, amount: 3519, discountPercent: 37, discountAmount: 2074 },
  8: { installment: '12x R$329,92', cash: 3959, amount: 3959, discountPercent: 38, discountAmount: 2433 },
  9: { installment: '12x R$366,59', cash: 4399, amount: 4399, discountPercent: 39, discountAmount: 2792 },
  10: { installment: '12x R$403,25', cash: 4839, amount: 4839, discountPercent: 39, discountAmount: 3151 },
};

const PLAN_PRICES_USD = {
  1: { display: '$799', amount: 799 },
  2: { display: '$1,598', amount: 1598 },
  3: { display: '$2,397', amount: 2397 },
  4: { display: '$2,199', amount: 2199 },
  5: { display: '$2,749', amount: 2749 },
  6: { display: '$3,299', amount: 3299 },
  7: { display: '$3,849', amount: 3849 },
  8: { display: '$4,399', amount: 4399 },
  9: { display: '$4,949', amount: 4949 },
  10: { display: '$5,499', amount: 5499 },
};

const PLAN_PRICES_EUR = {
  1: { display: '€799', amount: 799 },
  2: { display: '€1.598', amount: 1598 },
  3: { display: '€2.397', amount: 2397 },
  4: { display: '€2.199', amount: 2199 },
  5: { display: '€2.749', amount: 2749 },
  6: { display: '€3.299', amount: 3299 },
  7: { display: '€3.849', amount: 3849 },
  8: { display: '€4.399', amount: 4399 },
  9: { display: '€4.949', amount: 4949 },
  10: { display: '€5.499', amount: 5499 },
};

function clampCount(count) {
  return Math.min(MAX_CHILDREN, Math.max(MIN_CHILDREN, count));
}

function getByCount(map, count) {
  return map[clampCount(count)] ?? map[10];
}

const fmtBRL = (n) => `R$${Number(n).toLocaleString('pt-BR', { useGrouping: false })}`;

/** Region (br/us/eu) → display locale (pt/en/es) */
export function regionToLocale(region) {
  const map = { br: 'pt', us: 'en', eu: 'es' };
  return map[region] || 'en';
}

/**
 * @param {string} locale - 'pt' | 'en' | 'es'
 * @param {number} childCount
 */
export function getPlanPricing(locale, childCount) {
  const count = clampCount(childCount);
  if (locale === 'pt') {
    const br = getByCount(PLAN_PRICES_BR, count);
    const line2 = `ou ${fmtBRL(br.cash)} à vista`;
    const out = { line1: br.installment, line2, amount: br.amount };
    if (br.discountPercent != null && br.discountAmount != null) {
      out.discountPercent = br.discountPercent;
      out.discountAmount = br.discountAmount;
      out.discountFormatted = `Economize ${br.discountPercent}% (${fmtBRL(br.discountAmount)})`;
    }
    return out;
  }
  if (locale === 'es') {
    const eu = getByCount(PLAN_PRICES_EUR, count);
    return { line1: eu.display, line2: null, amount: eu.amount };
  }
  const us = getByCount(PLAN_PRICES_USD, count);
  return { line1: us.display, line2: null, amount: us.amount };
}

/** Human-readable children label for plan summary */
export function getChildrenPlanLabel(childCount) {
  const count = clampCount(childCount);
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

/** Payment note when line2 is not set (US/EU) */
export const PAYMENT_NOTE = 'or flexible payment options available at checkout';
