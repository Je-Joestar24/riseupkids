/**
 * RUK-SEC-007 — auth rate-limiting middleware behaviour.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-007
 */
const express = require('express');
const request = require('supertest');

const {
  makeAuthLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  publicFormLimiter,
} = require('../middleware/rateLimit');

/** Minimal app: one limited POST route + one unlimited GET route. */
function buildApp(limiter, { trustProxy } = {}) {
  const app = express();
  if (trustProxy !== undefined) app.set('trust proxy', trustProxy);
  app.use(express.json());
  app.post('/limited', limiter, (req, res) => res.status(200).json({ ok: true }));
  app.get('/open', (req, res) => res.status(200).json({ ok: true }));
  return app;
}

describe('rateLimit middleware — core behaviour', () => {
  it('allows requests up to the limit, then returns 429 with a generic JSON body', async () => {
    const app = buildApp(makeAuthLimiter({ windowMs: 60_000, limit: 3, validate: false }));

    for (let i = 1; i <= 3; i += 1) {
      const res = await request(app).post('/limited');
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).post('/limited');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      success: false,
      message: 'Too many requests. Please wait a moment and try again.',
    });
    // Generic on purpose — must not hint at account existence / lock state.
    expect(JSON.stringify(blocked.body)).not.toMatch(/lock|account|password|user/i);
  });

  it('sets Retry-After and standardised RateLimit-* headers on the 429', async () => {
    const app = buildApp(makeAuthLimiter({ windowMs: 60_000, limit: 1, validate: false }));

    await request(app).post('/limited'); // consume the single allowed hit
    const blocked = await request(app).post('/limited');

    expect(blocked.status).toBe(429);
    const retryAfter = Number(blocked.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
    // draft standard headers
    expect(blocked.headers).toHaveProperty('ratelimit-limit');
    expect(blocked.headers).not.toHaveProperty('x-ratelimit-limit'); // legacy headers disabled
  });

  it('counts per client IP — a different X-Forwarded-For gets its own budget', async () => {
    const app = buildApp(makeAuthLimiter({ windowMs: 60_000, limit: 2, validate: false }), { trustProxy: 1 });

    // client A exhausts its budget
    await request(app).post('/limited').set('X-Forwarded-For', '203.0.113.1');
    await request(app).post('/limited').set('X-Forwarded-For', '203.0.113.1');
    const aBlocked = await request(app).post('/limited').set('X-Forwarded-For', '203.0.113.1');
    expect(aBlocked.status).toBe(429);

    // client B is unaffected
    const bOk1 = await request(app).post('/limited').set('X-Forwarded-For', '203.0.113.2');
    const bOk2 = await request(app).post('/limited').set('X-Forwarded-For', '203.0.113.2');
    expect(bOk1.status).toBe(200);
    expect(bOk2.status).toBe(200);
  });

  it('lets requests through again after the window resets', async () => {
    const app = buildApp(makeAuthLimiter({ windowMs: 300, limit: 1, validate: false }));

    expect((await request(app).post('/limited')).status).toBe(200);
    expect((await request(app).post('/limited')).status).toBe(429);

    await new Promise((r) => setTimeout(r, 350)); // let the 300ms window elapse

    expect((await request(app).post('/limited')).status).toBe(200);
  });

  it('does not touch routes it is not mounted on', async () => {
    const app = buildApp(makeAuthLimiter({ windowMs: 60_000, limit: 1, validate: false }));

    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).get('/open');
      expect(res.status).toBe(200);
    }
  });
});

describe('rateLimit middleware — the exported limiters used by auth.routes.js', () => {
  it('the exported limiters are all distinct express middleware', () => {
    const all = [loginLimiter, registerLimiter, passwordResetLimiter, publicFormLimiter];
    for (const mw of all) {
      expect(typeof mw).toBe('function');
      expect(mw.length).toBe(3); // (req, res, next)
    }
    expect(new Set(all).size).toBe(all.length); // no two are the same instance
  });

  it('the exported loginLimiter actually blocks after enough requests, and registerLimiter keeps its own separate counter', async () => {
    const loginApp = buildApp(loginLimiter, { trustProxy: 1 });
    const registerApp = buildApp(registerLimiter, { trustProxy: 1 });
    const ip = '198.51.100.7';

    // Hammer login until it blocks (don't hard-code the default so this stays order-independent).
    let sawBlock = false;
    for (let i = 0; i < 200 && !sawBlock; i += 1) {
      const res = await request(loginApp).post('/limited').set('X-Forwarded-For', ip);
      if (res.status === 429) sawBlock = true;
    }
    expect(sawBlock).toBe(true);

    // Same IP, different limiter → still has budget.
    const reg = await request(registerApp).post('/limited').set('X-Forwarded-For', ip);
    expect(reg.status).toBe(200);
  });
});
