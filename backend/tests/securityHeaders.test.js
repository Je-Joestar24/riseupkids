/**
 * RUK-SEC-009 — API security response headers (Helmet config).
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-009
 */
const express = require('express');
const request = require('supertest');

function appWith(handler) {
  const app = express();
  app.use(handler);
  app.get('/x', (req, res) => res.json({ ok: true }));
  return app;
}

function freshHelmet(env = {}) {
  const snap = {};
  for (const k of ['HSTS_MAX_AGE']) {
    snap[k] = process.env[k];
    if (k in env) process.env[k] = env[k];
    else delete process.env[k];
  }
  jest.resetModules();
  const { buildHelmet } = require('../config/securityHeaders');
  const mw = buildHelmet();
  for (const [k, v] of Object.entries(snap)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return mw;
}

describe('config/securityHeaders buildHelmet', () => {
  it('sets the core hardening headers and removes X-Powered-By', async () => {
    const res = await request(appWith(freshHelmet())).get('/x');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('does NOT set a frame policy or a CSP (deliberate — JSON API)', async () => {
    const res = await request(appWith(freshHelmet())).get('/x');
    expect(res.headers['x-frame-options']).toBeUndefined();
    expect(res.headers['content-security-policy']).toBeUndefined();
  });

  it('enables HSTS with the default max-age (1 day), no includeSubDomains, no preload', async () => {
    const res = await request(appWith(freshHelmet())).get('/x');
    expect(res.headers['strict-transport-security']).toBe('max-age=86400');
  });

  it('honours HSTS_MAX_AGE', async () => {
    const res = await request(appWith(freshHelmet({ HSTS_MAX_AGE: '15552000' }))).get('/x');
    expect(res.headers['strict-transport-security']).toBe('max-age=15552000');
  });

  it('HSTS_MAX_AGE=0 disables HSTS entirely', async () => {
    const res = await request(appWith(freshHelmet({ HSTS_MAX_AGE: '0' }))).get('/x');
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });
});
