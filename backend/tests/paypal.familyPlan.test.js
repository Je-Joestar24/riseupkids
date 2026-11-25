/**
 * PayPal create-order, through the real route, the real controller and the real service.
 * Only PayPal's server (axios), the database model and login are faked. Prices: the one price list, 1 to 4 children.
 */
const express = require('express');
const request = require('supertest');

jest.mock('axios');
const axios = require('axios');

jest.mock('../models/User', () => ({}));
jest.mock('../middleware/paypalWebhook', () => (req, res, next) => next());
jest.mock('../controllers/paypalWebhook.controller', () => ({ handleWebhook: (req, res) => res.sendStatus(200) }));
jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    if (req.headers['x-test-user'] === 'none') return res.status(401).json({ message: 'Authentication required.' });
    req.user = { _id: { toString: () => 'user-1' }, role: 'parent' };
    return next();
  },
  authorize: () => (req, res, next) => next(),
}));

process.env.PAYPAL_API_BASE = 'https://api.paypal.test';
process.env.PAYPAL_CLIENT_ID = 'c';
process.env.PAYPAL_CLIENT_SECRET = 's';

const routes = require('../routes/paypal.routes');

const app = express();
app.use(express.json());
app.use('/api/paypal', routes);

const post = (body) => request(app).post('/api/paypal/create-order').send(body);
const orderSent = () => axios.post.mock.calls[1][1].purchase_units[0];

beforeEach(() => {
  axios.post.mockReset();
  axios.post
    .mockResolvedValueOnce({ data: { access_token: 'tok' } })
    .mockResolvedValueOnce({ data: { id: 'ORDER-1' } });
});

describe('create-order: a good request', () => {
  it.each([
    [{ tier: '1_child_USD' }, 'USD', '120.00'],
    [{ tier: '4_children_BRL' }, 'BRL', '2199.00'],
    [{ tier: '3_children_yearly_EUR' }, 'EUR', '250.00'],
    [{ childCount: 4, currency: 'USD', planType: 'yearly' }, 'USD', '310.00'],
    [{ childCount: 1, currency: 'BRL', planType: 'pay_in_4' }, 'BRL', '699.00'],
    [{ childCount: '2', currency: 'eur', planType: 'yearly' }, 'EUR', '190.00'],
  ])('%j -> %s %s', async (body, currency, value) => {
    const res = await post(body);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, orderID: 'ORDER-1' });
    expect(orderSent().amount).toEqual({ currency_code: currency, value });
  });

  it('"pay in 4" and "yearly" are the same price', async () => {
    await post({ childCount: 3, currency: 'USD', planType: 'pay_in_4' });
    const pay4 = orderSent().amount.value;
    axios.post.mockReset();
    axios.post.mockResolvedValueOnce({ data: { access_token: 'tok' } }).mockResolvedValueOnce({ data: { id: 'ORDER-2' } });
    await post({ childCount: 3, currency: 'USD', planType: 'yearly' });
    expect(orderSent().amount.value).toBe(pay4);
    expect(pay4).toBe('250.00');
  });
});

describe('create-order: sizes that are not sold are a 400', () => {
  it.each([[0], [5], [10], [-1], [2.5], ['abc'], [true]])('childCount %p', async (childCount) => {
    const res = await post({ childCount, currency: 'USD', planType: 'yearly' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/1 to 4/);
    expect(axios.post).not.toHaveBeenCalled(); // PayPal never contacted
  });

  it.each([['5_children_USD'], ['10_children_yearly_BRL'], ['0_children_USD'], ['constructor_USD']])('tier %p', async (tier) => {
    const res = await post({ tier });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid tier/);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('the list of valid tiers it offers has 24 entries and none above 4 children', async () => {
    const res = await post({ tier: '9_children_USD' });
    const listed = res.body.message.replace(/^Invalid tier\. Valid values: /, '').split(', ');
    expect(listed).toHaveLength(24);
    expect(listed.some((t) => /^([5-9]|10)_children/.test(t))).toBe(false);
  });

  it('"abc" used to be sold as 1 child; now it is refused', async () => {
    expect((await post({ childCount: 'abc', currency: 'USD', planType: 'yearly' })).status).toBe(400);
  });

  it('is never a 401 for a bad request (a 401 would log the web app out)', async () => {
    expect((await post({ childCount: 7, currency: 'USD', planType: 'yearly' })).status).not.toBe(401);
  });

  it('a currency we do not sell in is a 400 too', async () => {
    const res = await post({ childCount: 2, currency: 'GBP', planType: 'yearly' });
    expect(res.status).toBe(400);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('a signed-out request is refused first', async () => {
    const res = await request(app).post('/api/paypal/create-order').set('x-test-user', 'none').send({ tier: '1_child_USD' });
    expect(res.status).toBe(401);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
