/**
 * useSubscriptionPlan: the Family Plan price comes from the backend (the one price list). While it loads, when it
 * can not be loaded, and for a size that is not sold any more there is no price (null), never a guess.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BACKEND_PRICING } from '../test/backendPricing';
import useSubscriptionPlan from './useSubscriptionPlan';
import * as checkoutService from '../services/checkoutService';

vi.mock('../services/checkoutService', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchCheckoutPricing: vi.fn(),
}));

const store = configureStore({ reducer: { language: () => ({ current: 'en' }) } });
const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;
const settle = () => act(async () => {});
// The user object is created ONCE and passed in (as the real screen does: the same object on every render), so a
// plan that fails to refresh when the prices arrive can not be hidden by a new object each time.
const mount = (user) => renderHook(() => useSubscriptionPlan(user), { wrapper });
const fetchPricing = checkoutService.fetchCheckoutPricing;

const family = (extra = {}) => ({
  subscriptionStatus: 'active',
  planKidsLimit: 2,
  planRegion: 'br',
  paymentProvider: 'paypal',
  subscriptionStartDate: '2026-01-10T00:00:00.000Z',
  subscriptionCurrentPeriodEnd: '2027-01-10T00:00:00.000Z',
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe('a Family Plan', () => {
  it('shows no price while the prices load, and says it is loading', () => {
    fetchPricing.mockReturnValue(new Promise(() => {}));
    const { result } = mount(family());

    expect(result.current.planPricing).toBeNull();
    expect(result.current.priceLine2).toBeNull();
    expect(result.current.pricingStatus).toBe('loading');
  });

  it('then shows the price from the backend for her region and number of children', async () => {
    fetchPricing.mockResolvedValue(BACKEND_PRICING);
    const { result } = mount(family());
    await settle();

    expect(result.current.pricingStatus).toBe('ready');
    expect(result.current.planPricing).toMatchObject({ line1: 'R$1299', discountFormatted: 'Economize 7% (R$99)' });
    expect(result.current.priceLine2).toBe('or flexible payment options available at checkout');
    expect(result.current.childrenLabel).toBe('2 Children');
  });

  it.each([
    ['us', 3, '$250'],
    ['eu', 4, '€310'],
    ['br', 1, 'R$699'],
  ])('region %s with %i children shows %s', async (planRegion, planKidsLimit, expected) => {
    fetchPricing.mockResolvedValue(BACKEND_PRICING);
    const { result } = mount(family({ planRegion, planKidsLimit }));
    await settle();
    expect(result.current.planPricing.line1).toBe(expected);
  });

  it('shows no price when the prices can not be loaded (and does not crash)', async () => {
    fetchPricing.mockRejectedValue(new Error('offline'));
    const { result } = mount(family());
    await settle();

    expect(result.current.pricingStatus).toBe('error');
    expect(result.current.planPricing).toBeNull();
    expect(result.current.isFamilyPlan).toBe(true);
  });

  it('a family that bought 5 to 10 children before the limit became 4 still works, with no price shown', async () => {
    fetchPricing.mockResolvedValue(BACKEND_PRICING);
    const { result } = mount(family({ planKidsLimit: 7 }));
    await settle();

    expect(result.current.planPricing).toBeNull();
    expect(result.current.childrenLabel).toBe('7 Children');
    expect(result.current.childCount).toBe(7);
    expect(result.current.isActive).toBe(true);
  });

  it('asks the backend once', async () => {
    fetchPricing.mockResolvedValue(BACKEND_PRICING);
    mount(family());
    await settle();
    expect(fetchPricing).toHaveBeenCalledTimes(1);
  });
});

describe('not a Family Plan', () => {
  it('a legacy subscription keeps its own price line and never asks for the Family Plan prices', async () => {
    const { result } = mount({ subscriptionStatus: 'active', stripeSubscriptionId: 'sub_123' });
    await settle();

    expect(fetchPricing).not.toHaveBeenCalled();
    expect(result.current.isFamilyPlan).toBe(false);
    expect(result.current.planPricing).toEqual({ line1: '$9.99/mo', line2: 'Legacy monthly subscription', amount: 9.99 });
    expect(result.current.priceLine2).toBe('Legacy monthly subscription');
  });

  it('no user at all does not ask or crash', async () => {
    const { result } = mount(null);
    await settle();
    expect(fetchPricing).not.toHaveBeenCalled();
    expect(result.current.isFamilyPlan).toBe(false);
  });
});

describe('the price follows the backend', () => {
  it('a changed price on the backend is a changed price on the screen', async () => {
    const changed = JSON.parse(JSON.stringify(BACKEND_PRICING));
    changed.regions.us.plans[1].annualCents = 21000;
    fetchPricing.mockResolvedValue(changed);
    const { result } = mount(family({ planRegion: 'us', planKidsLimit: 2 }));
    await settle();
    expect(result.current.planPricing.line1).toBe('$210');
  });
});
