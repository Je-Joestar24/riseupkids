/**
 * RUK-SEC-031 — the info / health endpoints must be minimal in production.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-031
 */
const express = require('express');
const request = require('supertest');

const apiRoutes = require('../routes/api');

function app() {
  const a = express();
  a.use('/api', apiRoutes);
  return a;
}

const NODE_ENV = process.env.NODE_ENV;
afterEach(() => {
  process.env.NODE_ENV = NODE_ENV;
});

describe('api info routes', () => {
  it('production: GET /api/health returns only { status: "ok" } — no uptime', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(app()).get('/api/health');
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('production: POST /api returns a minimal body — no feature/role catalogue', async () => {
    process.env.NODE_ENV = 'production';
    const res = await request(app()).post('/api');
    expect(res.body).toEqual({ success: true, message: 'Rise Up Kids API' });
    expect(JSON.stringify(res.body)).not.toMatch(/features|Content Management|version/i);
  });

  it('staging is treated the same as production', async () => {
    process.env.NODE_ENV = 'staging';
    const res = await request(app()).get('/api/health');
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('development: the verbose responses are kept as a convenience', async () => {
    process.env.NODE_ENV = 'development';
    const health = await request(app()).get('/api/health');
    expect(health.body).toHaveProperty('uptime');
    const info = await request(app()).post('/api');
    expect(info.body.message).toMatch(/working/i);
  });
});
