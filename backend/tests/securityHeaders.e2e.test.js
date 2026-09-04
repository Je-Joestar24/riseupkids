/**
 * RUK-SEC-009 / -011 / -025 / -031 — end-to-end against the REAL server app.
 *
 * Requires ../server (which now only boots when run directly, not when required), so this drives
 * the actual middleware wiring — helmet, request-id, CORS, the trimmed info routes, the 404
 * handler, and the production error handler — over real HTTP with supertest. No DB is touched.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-009
 */

// Must be set BEFORE requiring ../server (dotenv.config() won't override an already-set var).
const ENV = {
  NODE_ENV: 'production',
  JWT_SECRET: 'e2e-only-secret-that-is-definitely-long-enough-000',
  MAIL_DRIVER: 'sendmail', // 'log' is rejected in production by config/mail.js
  CORS_ORIGIN: 'https://riseup.kids,https://app.riseup.kids',
  HSTS_MAX_AGE: '15552000',
  TRUST_PROXY: '1',
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

const request = require('supertest');
const app = require('../server');

afterAll(() => {
  for (const [k, v] of Object.entries(ENV_SNAPSHOT)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('security headers — real server, production mode', () => {
  it('every response carries the hardening headers and a request id', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['strict-transport-security']).toBe('max-age=15552000');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-frame-options']).toBeUndefined(); // deliberate
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('info endpoints — real server, production mode', () => {
  it('GET / is trimmed to { status: "ok" }', async () => {
    const res = await request(app).get('/');
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/health is trimmed (no uptime)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST /api is trimmed (no feature catalogue)', async () => {
    const res = await request(app).post('/api');
    expect(res.body).toEqual({ success: true, message: 'Rise Up Kids API' });
  });
});

describe('404 + CORS — real server, production mode', () => {
  it('an unknown route returns a generic 404 with a request id, not a 500', async () => {
    const res = await request(app).get('/api/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, message: 'Not found' });
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
    expect(JSON.stringify(res.body)).not.toContain('definitely-not-a-route');
  });

  it('a listed Origin is allowed', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://app.riseup.kids');
    expect(res.headers['access-control-allow-origin']).toBe('https://app.riseup.kids');
  });

  it('an unlisted Origin is not granted CORS access', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('the removed expo wildcard is not honoured', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://x.expo.dev');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
