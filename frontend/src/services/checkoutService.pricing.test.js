import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../api/axios';
import {
  fetchCheckoutPricing,
  findPlan,
  formatPrice,
  getChildrenPlanLabel,
  getPlanPricing,
  getSaving,
  normalizePricingResponse,
  regionToLocale,
} from './checkoutService';
import { BACKEND_PRICING } from '../test/backendPricing';

vi.mock('../api/axios', () => ({ default: { get: vi.fn() } }));

const clone = () => JSON.parse(JSON.stringify(BACKEND_PRICING));

beforeEach(() => vi.clearAllMocks());

describe('fetchCheckoutPricing', () => {
  it('asks the backend for the prices and returns the checked answer', async () => {
    api.get.mockResolvedValue({ data: BACKEND_PRICING });

    await expect(fetchCheckoutPricing()).resolves.toEqual(BACKEND_PRICING);
    expect(api.get).toHaveBeenCalledWith('/checkout/pricing');
  });

  it('a failed request rejects, so no price is shown', async () => {
    api.get.mockRejectedValue(new Error('Network Error'));
    await expect(fetchCheckoutPricing()).rejects.toThrow('Network Error');
  });

  it('a broken answer rejects', async () => {
    api.get.mockResolvedValue({ data: { minChildren: 1, maxChildren: 4, regions: {} } });
    await expect(fetchCheckoutPricing()).rejects.toThrow(/Prices could not be read/);
  });

  it('an empty answer rejects', async () => {
    api.get.mockResolvedValue({});
    await expect(fetchCheckoutPricing()).rejects.toThrow(/no answer/);
  });
});

describe('reading the backend answer', () => {
  it('accepts the real shape', () => {
    expect(normalizePricingResponse(clone())).toEqual(BACKEND_PRICING);
  });

  it.each([
    ['null', null],
    ['no limits', { regions: BACKEND_PRICING.regions }],
    ['a max below the min', { ...BACKEND_PRICING, minChildren: 3, maxChildren: 2 }],
    ['no regions', { minChildren: 1, maxChildren: 4 }],
  ])('refuses %s', (_name, data) => {
    expect(() => normalizePricingResponse(data)).toThrow(/Prices could not be read/);
  });

  it('refuses a missing region, the wrong currency, the wrong number of plans, plans out of order and bad prices', () => {
    const missing = clone(); delete missing.regions.eu;
    expect(() => normalizePricingResponse(missing)).toThrow(/missing eu/);
    const currency = clone(); currency.regions.br.currency = 'USD';
    expect(() => normalizePricingResponse(currency)).toThrow(/wrong currency for br/);
    const few = clone(); few.regions.us.plans.pop();
    expect(() => normalizePricingResponse(few)).toThrow(/wrong number of plans/);
    const order = clone(); order.regions.eu.plans.reverse();
    expect(() => normalizePricingResponse(order)).toThrow(/not in order/);
    for (const cents of [0, -1, 12.5, '12000', null, NaN]) {
      const bad = clone(); bad.regions.br.plans[1].annualCents = cents;
      expect(() => normalizePricingResponse(bad)).toThrow(/bad price for br 2/);
    }
  });
});

describe('formatting and plans', () => {
  it.each([
    [69900, 'pt', 'R$699'],
    [129900, 'pt', 'R$1299'],
    [12000, 'en', '$120'],
    [159800, 'en', '$1,598'],
    [159800, 'es', '€1.598'],
    [12050, 'en', '$120.50'],
  ])('%i cents on %s is %s', (cents, locale, expected) => {
    expect(formatPrice(cents, locale)).toBe(expected);
  });

  it.each([[null], [undefined], [-1], [12.5], [NaN]])('shows nothing for %p', (cents) => {
    expect(formatPrice(cents, 'en')).toBe('');
  });

  it('finds the plan for a locale and a number of children, and none for a size that is not sold', () => {
    expect(findPlan(BACKEND_PRICING, 'pt', 3)).toEqual({ children: 3, annualCents: 179900 });
    expect(findPlan(BACKEND_PRICING, 'en', 4)).toEqual({ children: 4, annualCents: 31000 });
    for (const kids of [0, 5, 7, 10, 2.5, '2', '4', null, undefined]) expect(findPlan(BACKEND_PRICING, 'en', kids)).toBeNull();
    expect(findPlan(null, 'en', 1)).toBeNull();
  });

  it('works out the saving from the backend prices', () => {
    expect(getSaving(BACKEND_PRICING, 'pt', 2)).toEqual({ savedCents: 9900, percent: 7 });
    expect(getSaving(BACKEND_PRICING, 'pt', 4)).toEqual({ savedCents: 59700, percent: 21 });
    expect(getSaving(BACKEND_PRICING, 'en', 3)).toEqual({ savedCents: 11000, percent: 31 });
    expect(getSaving(BACKEND_PRICING, 'pt', 1)).toBeNull();
    expect(getSaving(null, 'pt', 2)).toBeNull();
  });

  it('no saving when the bigger plan costs as much as buying one by one, or more', () => {
    const flat = clone();
    flat.regions.br.plans[1].annualCents = 139800; // exactly 2 x 69900
    expect(getSaving(flat, 'pt', 2)).toBeNull();
    expect(getPlanPricing(flat, 'pt', 2).discountFormatted).toBeUndefined();
    flat.regions.br.plans[1].annualCents = 150000;
    expect(getSaving(flat, 'pt', 2)).toBeNull();
  });

  it('plan pricing: the price from the backend, the saving for Brazil only, no second line', () => {
    expect(getPlanPricing(BACKEND_PRICING, 'pt', 1)).toEqual({ line1: 'R$699', line2: null, amount: 699 });
    expect(getPlanPricing(BACKEND_PRICING, 'pt', 2)).toMatchObject({ line1: 'R$1299', discountFormatted: 'Economize 7% (R$99)' });
    expect(getPlanPricing(BACKEND_PRICING, 'en', 4)).toEqual({ line1: '$310', line2: null, amount: 310 });
    expect(getPlanPricing(BACKEND_PRICING, 'es', 2)).toEqual({ line1: '€190', line2: null, amount: 190 });
  });

  it('plan pricing is null while there are no prices, and for a size that is not sold', () => {
    expect(getPlanPricing(null, 'en', 1)).toBeNull();
    expect(getPlanPricing(BACKEND_PRICING, 'en', 7)).toBeNull();
  });

  it('follows the backend', () => {
    const changed = clone();
    changed.regions.us.plans[0].annualCents = 15000;
    expect(getPlanPricing(changed, 'en', 1).line1).toBe('$150');
  });

  it('region to locale', () => {
    expect(regionToLocale('br')).toBe('pt');
    expect(regionToLocale('us')).toBe('en');
    expect(regionToLocale('eu')).toBe('es');
    expect(regionToLocale('xx')).toBe('en');
  });

  it.each([[1, '1 Child'], [2, '2 Children'], [4, '4 Children'], [7, '7 Children'], [0, '1 Child'], ['3', '3 Children'], [NaN, '1 Child']])(
    'the children label for %p is %s (older plans of 5 to 10 children still read right)',
    (count, label) => {
      expect(getChildrenPlanLabel(count)).toBe(label);
    }
  );
});
