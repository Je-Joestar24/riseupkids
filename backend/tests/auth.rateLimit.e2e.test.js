/**
 * RUK-SEC-007 — end-to-end: the real auth router (routes/auth.routes.js) applies the right
 * rate limiter to the right endpoint, blocks with 429 once the budget is spent, keeps the
 * limiters independent, and leaves non-auth / GET routes alone.
 *
 * Controllers and `protect` are stubbed so we exercise the routing + middleware wiring, not the DB.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-007
 */

// Tiny budgets so the test is fast. MUST be set before requiring the router (rateLimit.js reads
// these at module-load time).
const RL_ENV = {
  AUTH_LOGIN_MAX: '3',
  AUTH_LOGIN_WINDOW_MS: '60000',
  AUTH_REGISTER_MAX: '2',
  AUTH_REGISTER_WINDOW_MS: '60000',
  AUTH_PASSWORD_RESET_MAX: '2',
  AUTH_PASSWORD_RESET_WINDOW_MS: '60000',
};
const RL_ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(RL_ENV)) {
  RL_ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

jest.mock('../controllers/auth.controller', () => {
  const make = (label) => (req, res) => res.status(200).json({ ok: label });
  return {
    register: make('register'),
    registerUser: make('registerUser'),
    subscribeFlodesk: make('subscribeFlodesk'),
    login: make('login'),
    verifyLoginOtp: make('verifyLoginOtp'),
    resendLoginOtp: make('resendLoginOtp'),
    getMe: make('getMe'),
    logout: make('logout'),
    updateProfile: make('updateProfile'),
    changePassword: make('changePassword'),
    deleteAccount: make('deleteAccount'),
    getTerms: make('getTerms'),
    forgotPassword: make('forgotPassword'),
    resetPassword: make('resetPassword'),
  };
});

jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => next(),
  authorize: () => (req, res, next) => next(),
}));

const express = require('express');
const request = require('supertest');
const authRoutes = require('../routes/auth.routes');

afterAll(() => {
  for (const [k, v] of Object.entries(RL_ENV_SNAPSHOT)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

function buildApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.get('/api/other/health', (req, res) => res.status(200).json({ ok: true }));
  return app;
}

// Limiter state is per module-singleton, so vary the client IP per test to get a clean budget.
let ipCounter = 0;
const nextIp = () => `203.0.113.${(ipCounter += 1)}`;

async function hit(app, method, path, ip, times) {
  const results = [];
  for (let i = 0; i < times; i += 1) {
    const res = await request(app)[method](path).set('X-Forwarded-For', ip).send({});
    results.push(res.status);
  }
  return results;
}

describe('auth.routes.js rate limiting (e2e)', () => {
  it('POST /api/auth/login: allows AUTH_LOGIN_MAX (3), blocks the next with 429 + Retry-After', async () => {
    const app = buildApp();
    const ip = nextIp();

    expect(await hit(app, 'post', '/api/auth/login', ip, 3)).toEqual([200, 200, 200]);

    const blocked = await request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({ success: false });
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('POST /api/auth/verify-login-otp shares the login budget (same limiter)', async () => {
    const app = buildApp();
    const ip = nextIp();

    await hit(app, 'post', '/api/auth/login', ip, 2);
    const otp1 = await request(app).post('/api/auth/verify-login-otp').set('X-Forwarded-For', ip).send({});
    expect(otp1.status).toBe(200); // 3rd request across the shared login bucket

    const otp2 = await request(app).post('/api/auth/verify-login-otp').set('X-Forwarded-For', ip).send({});
    expect(otp2.status).toBe(429);
  });

  it('POST /api/auth/register uses a separate, tighter budget (AUTH_REGISTER_MAX = 2)', async () => {
    const app = buildApp();
    const ip = nextIp();

    expect(await hit(app, 'post', '/api/auth/register', ip, 3)).toEqual([200, 200, 429]);

    // login budget for the same IP is untouched — different limiter
    const login = await request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send({});
    expect(login.status).toBe(200);
  });

  it('forgot-password / reset-password / resend-login-otp share one password-reset budget (2)', async () => {
    const app = buildApp();
    const ip = nextIp();

    const a = await request(app).post('/api/auth/forgot-password').set('X-Forwarded-For', ip).send({});
    const b = await request(app).post('/api/auth/reset-password').set('X-Forwarded-For', ip).send({});
    const c = await request(app).post('/api/auth/resend-login-otp').set('X-Forwarded-For', ip).send({});

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(c.status).toBe(429); // 3rd call across the shared bucket
  });

  it('GET /api/auth/terms is not rate limited', async () => {
    const app = buildApp();
    const ip = nextIp();
    for (let i = 0; i < 15; i += 1) {
      expect((await request(app).get('/api/auth/terms').set('X-Forwarded-For', ip)).status).toBe(200);
    }
  });

  it('protected GET /api/auth/me is not rate limited', async () => {
    const app = buildApp();
    const ip = nextIp();
    for (let i = 0; i < 15; i += 1) {
      expect((await request(app).get('/api/auth/me').set('X-Forwarded-For', ip)).status).toBe(200);
    }
  });

  it('non-auth routes are completely unaffected', async () => {
    const app = buildApp();
    const ip = nextIp();
    for (let i = 0; i < 30; i += 1) {
      expect((await request(app).get('/api/other/health').set('X-Forwarded-For', ip)).status).toBe(200);
    }
  });

  it('a different client IP gets its own login budget', async () => {
    const app = buildApp();
    const ipA = nextIp();
    const ipB = nextIp();

    await hit(app, 'post', '/api/auth/login', ipA, 3);
    expect((await request(app).post('/api/auth/login').set('X-Forwarded-For', ipA).send({})).status).toBe(429);

    expect(await hit(app, 'post', '/api/auth/login', ipB, 3)).toEqual([200, 200, 200]);
  });
});
