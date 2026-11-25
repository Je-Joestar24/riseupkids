/**
 * Stripe Family Plan checkout, through the real route and the real error handler.
 * Only Stripe and login are faked. Prices come from the ONE price list; there is no box; bad input is a 400.
 */
const express = require('express');
const request = require('supertest');

// A fake Stripe with price ids for 1 to 4 children, plus an OLD id for 5 children that must never be reachable
const mockCreate = jest.fn();
jest.mock('../config/stripe', () => ({
  stripe: { checkout: { sessions: { create: (...args) => mockCreate(...args) } } },
  STRIPE_FAMILY_PLAN_PRODUCT_ID: 'prod_family',
  STRIPE_FAMILY_PLAN_PRICES: {
    br: { 1: 'price_br_1', 2: 'price_br_2', 3: 'price_br_3', 4: 'price_br_4', 5: 'price_br_5_OLD' },
    us: { 1: 'price_us_1', 2: 'price_us_2', 3: 'price_us_3', 4: 'price_us_4' },
    eu: { 1: 'price_eu_1', 2: 'price_eu_2', 3: 'price_eu_3' }, // eu 4 deliberately missing
  },
}));

jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    if (req.headers['x-test-user'] === 'none') return res.status(401).json({ message: 'Authentication required.' });
    req.user = { _id: { toString: () => 'user-1' }, email: 'parent@example.com', role: 'parent' };
    return next();
  },
  authorize: () => (req, res, next) => next(),
}));

const errorHandler = require('../middleware/errorHandler');
const checkoutRoutes = require('../routes/checkout.routes');
const { createFamilyPlanCheckoutSession, getCheckoutConfig } = require('../services/checkout.services');

const app = express();
app.use(express.json());
app.use('/api/checkout', checkoutRoutes);
app.use(errorHandler);

const post = (body) => request(app).post('/api/checkout/create-session').send(body);

beforeEach(() => {
  mockCreate.mockReset();
  mockCreate.mockResolvedValue({ id: 'cs_test_1', url: 'https://checkout.stripe.com/pay/cs_test_1' });
});

describe('GET /api/checkout/pricing', () => {
  it('is public and returns the annual prices in cents for every region, 1 to 4 children', async () => {
    const res = await request(app).get('/api/checkout/pricing');

    expect(res.status).toBe(200);
    expect(res.body.minChildren).toBe(1);
    expect(res.body.maxChildren).toBe(4);
    expect(res.body.regions.br).toEqual({
      currency: 'BRL',
      plans: [
        { children: 1, annualCents: 69900 },
        { children: 2, annualCents: 129900 },
        { children: 3, annualCents: 179900 },
        { children: 4, annualCents: 219900 },
      ],
    });
    expect(res.body.regions.us.plans.map((p) => p.annualCents)).toEqual([12000, 19000, 25000, 31000]);
    expect(res.body.regions.eu.plans.map((p) => p.annualCents)).toEqual([12000, 19000, 25000, 31000]);
  });

  it('does not show monthly prices (monthly is closed) and no box', async () => {
    const res = await request(app).get('/api/checkout/pricing');
    expect(JSON.stringify(res.body)).not.toMatch(/monthly|box/i);
  });

  it('needs no login', async () => {
    const res = await request(app).get('/api/checkout/pricing').set('x-test-user', 'none');
    expect(res.status).toBe(200);
  });
});

describe('GET /api/checkout/config', () => {
  it('says 1 to 4 children', async () => {
    const res = await request(app).get('/api/checkout/config');
    expect(res.body).toMatchObject({ minChildren: 1, maxChildren: 4 });
    expect(getCheckoutConfig().maxChildren).toBe(4);
  });
});

describe('create-session: a good request', () => {
  it.each([
    ['br', 1, 'price_br_1'],
    ['br', 4, 'price_br_4'],
    ['us', 2, 'price_us_2'],
    ['eu', 3, 'price_eu_3'],
  ])('region %s, %i children -> the one Stripe price %s, quantity 1, nothing else', async (region, childCount, priceId) => {
    const res = await post({ region, childCount });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ sessionId: 'cs_test_1', url: expect.stringContaining('checkout.stripe.com') });
    const params = mockCreate.mock.calls[0][0];
    expect(params.mode).toBe('payment');
    expect(params.customer_email).toBe('parent@example.com');
    expect(params.success_url).toMatch(/\{CHECKOUT_SESSION_ID\}/);
    expect(params.cancel_url).toMatch(/\/checkout\/cancel$/);
    expect(params.line_items).toEqual([{ price: priceId, quantity: 1 }]);
    expect(params.metadata).toMatchObject({ userId: 'user-1', familyPlan: '1', region, childCount: String(childCount) });
  });

  it('accepts the child count as a plain digit string', async () => {
    const res = await post({ region: 'us', childCount: '3' });
    expect(res.status).toBe(201);
    expect(mockCreate.mock.calls[0][0].line_items[0].price).toBe('price_us_3');
  });

  it('saves the clean child count and region in the metadata, whatever form they arrived in', async () => {
    const res = await post({ region: ' US ', childCount: ' 3 ' });
    expect(res.status).toBe(201);
    expect(mockCreate.mock.calls[0][0].metadata).toMatchObject({ region: 'us', childCount: '3' });
  });

  it('accepts the region in capitals or with spaces', async () => {
    const res = await post({ region: ' BR ', childCount: 2 });
    expect(res.status).toBe(201);
    expect(mockCreate.mock.calls[0][0].line_items[0].price).toBe('price_br_2');
  });

  it('passes the terms version through', async () => {
    await post({ region: 'br', childCount: 1, termsVersion: 'terms_v9' });
    expect(mockCreate.mock.calls[0][0].metadata.terms_version).toBe('terms_v9');
  });
});

describe('create-session: no activity box', () => {
  it('an old app that still sends the box gets the plan only, with no box line and no box in the metadata', async () => {
    const res = await post({ region: 'br', childCount: 2, addBox: true });

    expect(res.status).toBe(201);
    const params = mockCreate.mock.calls[0][0];
    expect(params.line_items).toHaveLength(1);
    expect(JSON.stringify(params)).not.toMatch(/box/i);
    expect(params.line_items[0].price_data).toBeUndefined();
  });

  it('never builds a price on the fly (everything charged is a price made by the create script)', async () => {
    await post({ region: 'us', childCount: 4, addBox: true });
    expect(JSON.stringify(mockCreate.mock.calls[0][0].line_items)).not.toMatch(/unit_amount|price_data/);
  });
});

describe('create-session: bad input is a 400, never a plan', () => {
  it.each([[0], [5], [10], [-1], [2.5], ['abc'], ['5'], [true], [[2]], [{}]])('childCount %p', async (childCount) => {
    const res = await post({ region: 'br', childCount });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: 'INVALID_CHILD_COUNT' });
    expect(res.body.message).toMatch(/1 to 4/);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('5 children can not reach the old 5-children price even though it is still in the price file', async () => {
    const res = await post({ region: 'br', childCount: 5 });
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('"abc" used to be sold as 1 child; now it is refused', async () => {
    const res = await post({ region: 'us', childCount: 'abc' });
    expect(res.status).toBe(400);
  });

  it.each([['xx'], ['BRL'], ['constructor'], ['__proto__'], [123]])('region %p', async (region) => {
    const res = await post({ region, childCount: 1 });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_REGION_OR_CURRENCY');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('missing region or child count keeps its own message', async () => {
    expect((await post({ childCount: 1 })).body.message).toMatch(/region and childCount are required/);
    expect((await post({ region: 'br' })).body.message).toMatch(/region and childCount are required/);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('is never a 401 for a bad request (a 401 would log the web app out)', async () => {
    const res = await post({ region: 'br', childCount: 9 });
    expect(res.status).not.toBe(401);
  });

  it('a signed-out request is refused before anything else', async () => {
    const res = await request(app).post('/api/checkout/create-session').set('x-test-user', 'none').send({ region: 'br', childCount: 1 });
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('create-session: the server\'s own set-up problems', () => {
  it('a size with no Stripe price id is a clear server error that says what to run', async () => {
    const res = await post({ region: 'eu', childCount: 4 });

    expect(res.status).toBe(500);
    expect(mockCreate).not.toHaveBeenCalled();
    await expect(createFamilyPlanCheckoutSession({ userId: 'u', userEmail: 'a@b.c', region: 'eu', childCount: 4, successUrl: 's', cancelUrl: 'c' }))
      .rejects.toThrow(/createStripePrices\.js.*stripe:verify-prices/s);
  });

  it('a Stripe failure is not turned into a 400', async () => {
    mockCreate.mockRejectedValueOnce(new Error('No such price: price_br_1'));
    const res = await post({ region: 'br', childCount: 1 });
    expect(res.status).toBe(500);
  });
});

describe('the service directly', () => {
  const base = { userId: 'u1', userEmail: 'a@b.c', successUrl: 'https://s', cancelUrl: 'https://c' };

  it('returns the session id and url', async () => {
    await expect(createFamilyPlanCheckoutSession({ ...base, region: 'br', childCount: 1 })).resolves.toEqual({
      sessionId: 'cs_test_1',
      url: 'https://checkout.stripe.com/pay/cs_test_1',
    });
  });

  it('refuses a bad request before it touches Stripe', async () => {
    await expect(createFamilyPlanCheckoutSession({ ...base, region: 'br', childCount: 0 })).rejects.toMatchObject({ code: 'INVALID_CHILD_COUNT' });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
