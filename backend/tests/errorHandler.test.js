/**
 * RUK-SEC-011 — central error handler must not leak internals on a production 5xx,
 * and RUK-SEC-031 — the 404 handler returns a real 404 with a generic body.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-011
 */
const express = require('express');
const request = require('supertest');
const requestId = require('../middleware/requestId');
const notFound = require('../middleware/notFound');
const errorHandler = require('../middleware/errorHandler');

function buildApp() {
  const app = express();
  app.use(requestId);
  app.get('/boom', () => {
    throw new Error('DB connection string mongodb://user:pass@host failed');
  });
  app.get('/bad-request', (req, res, next) => {
    const e = new Error('email is required');
    e.statusCode = 400;
    next(e);
  });
  app.get('/cast', (req, res, next) => {
    const e = new Error('Cast to ObjectId failed');
    e.name = 'CastError';
    next(e);
  });
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

const NODE_ENV = process.env.NODE_ENV;
let errSpy;
let warnSpy;
beforeEach(() => {
  errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  errSpy.mockRestore();
  warnSpy.mockRestore();
  process.env.NODE_ENV = NODE_ENV;
});

describe('errorHandler', () => {
  it('production 5xx: generic message, no stack, no leaked detail — but keeps the request id', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(buildApp()).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      success: false,
      message: 'Something went wrong. Please try again.',
      requestId: expect.any(String),
    });
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
    expect(JSON.stringify(res.body)).not.toMatch(/mongodb|pass@host|at Object|\.js:/);
    // full detail was still logged server-side
    expect(errSpy).toHaveBeenCalled();
  });

  it('development 5xx: keeps the message and stack for debugging', async () => {
    process.env.NODE_ENV = 'development';
    const res = await request(buildApp()).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body.message).toMatch(/DB connection string/);
    expect(res.body.stack).toEqual(expect.stringContaining('errorHandler.test.js'));
  });

  it('4xx validation errors are passed through unchanged in production (they are user-facing)', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(buildApp()).get('/bad-request');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('email is required');
  });

  it('maps a Mongoose CastError to a 404 "Resource not found"', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(buildApp()).get('/cast');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Resource not found');
  });

  it('unknown route → 404 with a generic body (not a 500, no URL echo)', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(buildApp()).get('/no/such/thing?q=1');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, message: 'Not found' });
    expect(JSON.stringify(res.body)).not.toContain('/no/such/thing');
  });
});
