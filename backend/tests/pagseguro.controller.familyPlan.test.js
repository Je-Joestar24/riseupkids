/**
 * PagBank create-checkout, through the real route and the real error handler.
 * Only PagBank's server, the database and login are faked. BRL annual price, 1 to 4 children, no box, bad input is a 400.
 */
const express = require('express');
const request = require('supertest');

jest.mock('axios');
const axios = require('axios');

const mockCreate = jest.fn();
const mockDelete = jest.fn();
jest.mock('../models/PagSeguroCheckout', () => ({
  create: (...args) => mockCreate(...args),
  deleteOne: (...args) => mockDelete(...args),
}));
jest.mock('../models/User', () => ({
  findByIdAndUpdate: jest.fn(() => ({ catch: () => {} })),
}));
jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    if (req.headers['x-test-user'] === 'none') return res.status(401).json({ message: 'Authentication required.' });
    req.user = { _id: 'user-1', email: 'maria@example.com', name: 'Maria Silva', role: 'parent' };
    return next();
  },
  authorize: () => (req, res, next) => next(),
}));

process.env.PAGSEGURO_ACCESS_TOKEN = process.env.PAGSEGURO_ACCESS_TOKEN || 'test-token';
process.env.PAGSEGURO_API_BASE = process.env.PAGSEGURO_API_BASE || 'https://sandbox.api.pagseguro.com';

const errorHandler = require('../middleware/errorHandler');
const routes = require('../routes/pagseguro.routes');

const app = express();
app.use(express.json());
app.use('/api/pagseguro', routes);
app.use(errorHandler);

const person = { taxId: '529.982.247-25', phone: { area: '11', number: '987654321' } };
const post = (body) => request(app).post('/api/pagseguro/create-checkout').send(body);
const sheetBrl = { 1: 69900, 2: 129900, 3: 179900, 4: 219900 };

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockImplementation(async (doc) => ({ ...doc, save: jest.fn().mockResolvedValue(undefined), _id: 'pending-1' }));
  mockDelete.mockReturnValue({ catch: () => {} });
  axios.post.mockReset();
  axios.post.mockResolvedValue({ data: { id: 'CHEC_1', links: [{ rel: 'PAY', href: 'https://pagamento.example/pay' }] } });
});

describe('GET /api/pagseguro/config', () => {
  it('says 1 to 4 children, in BRL', async () => {
    const res = await request(app).get('/api/pagseguro/config');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ region: 'br', currency: 'BRL', minChildren: 1, maxChildren: 4 });
  });
});

describe('create-checkout: a good request', () => {
  it.each([[1], [2], [3], [4]])('%i child(ren): the saved order and the amount sent to PagBank are the sheet price', async (kids) => {
    const res = await post({ childCount: kids, ...person });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, checkoutId: 'CHEC_1', amountCents: sheetBrl[kids] });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ childCount: kids, amountCents: sheetBrl[kids], currency: 'BRL' }));
    const sent = axios.post.mock.calls[0][1];
    expect(sent.items).toEqual([expect.objectContaining({ unit_amount: sheetBrl[kids] })]);
  });

  it('accepts the child count as a plain digit string', async () => {
    const res = await post({ childCount: '2', ...person });
    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ childCount: 2, amountCents: 129900 }));
  });
});

describe('create-checkout: no activity box', () => {
  it('an old app that still sends the box gets the plan only: not saved, not sent, not charged', async () => {
    const res = await post({ childCount: 2, addBox: true, ...person });

    expect(res.status).toBe(201);
    expect(res.body.amountCents).toBe(129900);
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('addBox');
    expect(axios.post.mock.calls[0][1].items).toHaveLength(1);
    expect(JSON.stringify(axios.post.mock.calls[0][1])).not.toMatch(/box/i);
  });
});

describe('create-checkout: bad input is a 400, never a plan', () => {
  it.each([[0], [5], [10], [-1], [2.5], ['abc'], [true], [[2]]])('childCount %p', async (childCount) => {
    const res = await post({ childCount, ...person });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: 'INVALID_CHILD_COUNT' });
    expect(res.body.message).toMatch(/1 to 4/);
    expect(mockCreate).not.toHaveBeenCalled(); // nothing saved
    expect(axios.post).not.toHaveBeenCalled(); // PagBank never contacted
  });

  it('5 children used to be sold at R$2639; now it is refused', async () => {
    const res = await post({ childCount: 5, ...person });
    expect(res.status).toBe(400);
  });

  it('"abc" used to be sold as 1 child; now it is refused', async () => {
    expect((await post({ childCount: 'abc', ...person })).status).toBe(400);
  });

  it('is never a 401 for a bad request (a 401 would log the web app out)', async () => {
    expect((await post({ childCount: 9, ...person })).status).not.toBe(401);
  });

  it('keeps its own messages for the other missing fields', async () => {
    expect((await post({ ...person })).body.message).toMatch(/childCount is required/);
    expect((await post({ childCount: 1, phone: person.phone })).body.message).toMatch(/taxId/);
    expect((await post({ childCount: 1, taxId: person.taxId })).body.message).toMatch(/phone/);
  });

  it('a signed-out request is refused first', async () => {
    const res = await request(app).post('/api/pagseguro/create-checkout').set('x-test-user', 'none').send({ childCount: 1, ...person });
    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
