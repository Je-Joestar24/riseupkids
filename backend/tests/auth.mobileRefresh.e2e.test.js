/**
 * Chunk 9 Phase C — mobile refresh-token transport.
 *
 * The Expo app has no browser-style cookie jar, so it can't rely on the httpOnly `rt` cookie web
 * uses. Instead, a request tagged `X-Client-Platform: mobile` gets the refresh token back in the
 * JSON body too (in addition to the cookie, which mobile just ignores), and can present it again
 * via `refreshToken` in the request body instead of a cookie. A plain browser request must NEVER
 * see the refresh token in a JSON body under any circumstance — that's the whole point of the
 * httpOnly cookie.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 9)
 */
const ENV = {
  JWT_SECRET: process.env.JWT_SECRET || 'e2e-only-secret-that-is-long-enough-1234567890',
  MAIL_DRIVER: 'log',
  AUTH_LOGIN_MAX: '100000',
  AUTH_REFRESH_MAX: '100000',
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const { User } = require('../models');
const RefreshToken = require('../models/RefreshToken');
const authRoutes = require('../routes/auth.routes');
const errorHandler = require('../middleware/errorHandler');

jest.setTimeout(60000);

const GOOD_PASSWORD = 'CorrectHorse42';
const MOBILE_HEADERS = { 'X-Client-Platform': 'mobile' };

function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

let mongod;
let app;

async function makeUser(overrides = {}) {
  return User.create({
    name: 'Mobile E2E User',
    email: 'mobile-e2e@example.com',
    password: GOOD_PASSWORD,
    role: 'parent',
    ...overrides,
  });
}

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = buildApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => {});
  if (mongod) await mongod.stop().catch(() => {});
  for (const [k, v] of Object.entries(ENV_SNAPSHOT)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), RefreshToken.deleteMany({})]);
});

describe('login — X-Client-Platform: mobile changes the response shape', () => {
  it('a mobile-tagged login gets the refresh token in the body', async () => {
    await makeUser({ email: 'mobile1@example.com' });
    const res = await request(app)
      .post('/api/auth/login')
      .set(MOBILE_HEADERS)
      .send({ email: 'mobile1@example.com', password: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(typeof res.body.data.refreshToken).toBe('string');
    expect(res.body.data.refreshToken.length).toBeGreaterThan(20);
  });

  it('a plain (web) login NEVER gets the refresh token in the body, even though a cookie is also set', async () => {
    await makeUser({ email: 'web1@example.com' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'web1@example.com', password: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.refreshToken).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/"refreshToken"/);
    const cookieHeader = (res.headers['set-cookie'] || []).find((c) => c.startsWith('rt='));
    expect(cookieHeader).toBeTruthy();
  });
});

describe('POST /api/auth/refresh — body-based transport (no cookie)', () => {
  it('rotates using a refreshToken in the body, with no cookie sent at all', async () => {
    await makeUser({ email: 'mobile2@example.com' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set(MOBILE_HEADERS)
      .send({ email: 'mobile2@example.com', password: GOOD_PASSWORD });
    const firstRefreshToken = loginRes.body.data.refreshToken;
    expect(firstRefreshToken).toBeTruthy();

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set(MOBILE_HEADERS)
      .send({ refreshToken: firstRefreshToken });

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.token).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).toBeTruthy();
    expect(refreshRes.body.data.refreshToken).not.toBe(firstRefreshToken); // rotated
  });

  it('returns 401 for a body refreshToken that does not exist', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set(MOBILE_HEADERS)
      .send({ refreshToken: 'not-a-real-token' });
    expect(res.status).toBe(401);
  });

  it('REUSE DETECTION also applies over the body transport', async () => {
    await makeUser({ email: 'mobile3@example.com' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set(MOBILE_HEADERS)
      .send({ email: 'mobile3@example.com', password: GOOD_PASSWORD });
    const original = loginRes.body.data.refreshToken;

    const first = await request(app)
      .post('/api/auth/refresh')
      .set(MOBILE_HEADERS)
      .send({ refreshToken: original });
    expect(first.status).toBe(200);

    // Replay the original (already-rotated) token.
    const replay = await request(app)
      .post('/api/auth/refresh')
      .set(MOBILE_HEADERS)
      .send({ refreshToken: original });
    expect(replay.status).toBe(401);

    // The legitimate rotated token is now dead too — the whole chain was revoked.
    const legitAfter = await request(app)
      .post('/api/auth/refresh')
      .set(MOBILE_HEADERS)
      .send({ refreshToken: first.body.data.refreshToken });
    expect(legitAfter.status).toBe(401);
  });

  it('a web browser session and a mobile session for the same user are independent', async () => {
    const user = await makeUser({ email: 'both1@example.com' });
    const webAgent = request.agent(app);
    await webAgent.post('/api/auth/login').send({ email: 'both1@example.com', password: GOOD_PASSWORD });

    const mobileLogin = await request(app)
      .post('/api/auth/login')
      .set(MOBILE_HEADERS)
      .send({ email: 'both1@example.com', password: GOOD_PASSWORD });

    // Both refresh independently without affecting each other.
    const webRefresh = await webAgent.post('/api/auth/refresh').send();
    const mobileRefresh = await request(app)
      .post('/api/auth/refresh')
      .set(MOBILE_HEADERS)
      .send({ refreshToken: mobileLogin.body.data.refreshToken });

    expect(webRefresh.status).toBe(200);
    expect(mobileRefresh.status).toBe(200);
  });
});

describe('POST /api/auth/logout — body-based transport', () => {
  it('revokes a mobile session given its refreshToken in the body', async () => {
    await makeUser({ email: 'mobile4@example.com' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set(MOBILE_HEADERS)
      .send({ email: 'mobile4@example.com', password: GOOD_PASSWORD });
    const refreshToken = loginRes.body.data.refreshToken;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set(MOBILE_HEADERS)
      .send({ refreshToken });
    expect(logoutRes.status).toBe(200);

    const after = await request(app)
      .post('/api/auth/refresh')
      .set(MOBILE_HEADERS)
      .send({ refreshToken });
    expect(after.status).toBe(401);
  });
});

describe('cross-device revocation reaches mobile too', () => {
  it('logout-all (triggered from web) also kills an active mobile session', async () => {
    await makeUser({ email: 'crossdevice1@example.com' });
    const mobileLogin = await request(app)
      .post('/api/auth/login')
      .set(MOBILE_HEADERS)
      .send({ email: 'crossdevice1@example.com', password: GOOD_PASSWORD });

    const webAgent = request.agent(app);
    const webLogin = await webAgent
      .post('/api/auth/login')
      .send({ email: 'crossdevice1@example.com', password: GOOD_PASSWORD });

    await webAgent
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${webLogin.body.data.token}`)
      .send();

    const mobileRefreshAfter = await request(app)
      .post('/api/auth/refresh')
      .set(MOBILE_HEADERS)
      .send({ refreshToken: mobileLogin.body.data.refreshToken });
    expect(mobileRefreshAfter.status).toBe(401);
  });

  it('a password change (from mobile itself) invalidates the mobile access token immediately', async () => {
    await makeUser({ email: 'crossdevice2@example.com' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set(MOBILE_HEADERS)
      .send({ email: 'crossdevice2@example.com', password: GOOD_PASSWORD });
    const oldToken = loginRes.body.data.token;

    await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: GOOD_PASSWORD, newPassword: 'AnotherNew99' });

    const meAfter = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(meAfter.status).toBe(401);
  });
});
