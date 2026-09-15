/**
 * Chunk 9 — refresh-token session lifecycle, full stack: auth.routes.js -> controllers ->
 * auth.services/session.services -> Mongoose models -> a real in-memory MongoDB, driven over
 * HTTP with supertest (cookie jar via supertest's `.agent()`, exactly like a real browser).
 *
 * Covers the plan's exit criteria: rotation on every refresh, reuse detection revokes the whole
 * chain, logout/logout-all revoke sessions, per-session listing/revocation is ownership-scoped.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 9)
 */
const ENV = {
  JWT_SECRET: process.env.JWT_SECRET || 'e2e-only-secret-that-is-long-enough-1234567890',
  MAIL_DRIVER: 'log',
  AUTH_LOGIN_MAX: '100000',
  AUTH_REFRESH_MAX: '100000',
  REFRESH_TOKEN_EXPIRE_DAYS: '30',
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
    name: 'E2E User',
    email: 'refresh-e2e@example.com',
    password: GOOD_PASSWORD,
    role: 'parent',
    ...overrides,
  });
}

function getCookie(res, name) {
  const raw = res.headers['set-cookie'] || [];
  const line = raw.find((c) => c.startsWith(`${name}=`));
  return line ? line.split(';')[0].split('=')[1] : null;
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

describe('login sets an httpOnly refresh cookie, never the plaintext refresh token in the body', () => {
  it('login response body has a token but no refreshToken field; a refresh cookie is set', async () => {
    await makeUser({ email: 'plain@example.com' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'plain@example.com', password: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.refreshToken).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/"rt"/);

    const cookieHeader = (res.headers['set-cookie'] || []).find((c) => c.startsWith('rt='));
    expect(cookieHeader).toBeTruthy();
    expect(cookieHeader).toMatch(/HttpOnly/i);
    expect(cookieHeader).toMatch(/Path=\/api\/auth/i);
  });
});

describe('POST /api/auth/refresh — rotation', () => {
  it('exchanges a valid refresh cookie for a new access token and rotates the cookie', async () => {
    const agent = request.agent(app);
    await makeUser({ email: 'rotate@example.com' });
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: 'rotate@example.com', password: GOOD_PASSWORD });
    const firstRt = getCookie(loginRes, 'rt');

    const refreshRes = await agent.post('/api/auth/refresh').send();
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.token).toBeTruthy();

    const secondRt = getCookie(refreshRes, 'rt');
    expect(secondRt).toBeTruthy();
    expect(secondRt).not.toBe(firstRt);
  });

  it('returns 401 with no cookie at all', async () => {
    const res = await request(app).post('/api/auth/refresh').send();
    expect(res.status).toBe(401);
  });

  it('returns 401 for a garbage cookie value', async () => {
    const res = await request(app).post('/api/auth/refresh').set('Cookie', 'rt=not-a-real-token').send();
    expect(res.status).toBe(401);
  });

  it('REUSE DETECTION: replaying an already-rotated refresh token forces re-login everywhere', async () => {
    const agent = request.agent(app);
    await makeUser({ email: 'reuse@example.com' });
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: 'reuse@example.com', password: GOOD_PASSWORD });
    const originalRt = getCookie(loginRes, 'rt');

    // Legitimate rotation happens (agent's cookie jar now holds the NEW token).
    await agent.post('/api/auth/refresh').send();

    // An attacker who captured the ORIGINAL cookie replays it.
    const replay = await request(app).post('/api/auth/refresh').set('Cookie', `rt=${originalRt}`).send();
    expect(replay.status).toBe(401);

    // The legitimate client's rotated cookie is now ALSO dead — the whole chain was revoked.
    const legitAfter = await agent.post('/api/auth/refresh').send();
    expect(legitAfter.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the session and clears the cookie; works even with an expired/absent access token', async () => {
    const agent = request.agent(app);
    await makeUser({ email: 'logout@example.com' });
    await agent.post('/api/auth/login').send({ email: 'logout@example.com', password: GOOD_PASSWORD });

    const res = await agent.post('/api/auth/logout').send();
    expect(res.status).toBe(200);
    const cleared = (res.headers['set-cookie'] || []).find((c) => c.startsWith('rt='));
    expect(cleared).toMatch(/rt=;/);

    const refreshAfter = await agent.post('/api/auth/refresh').send();
    expect(refreshAfter.status).toBe(401);
  });

  it('is a clean no-op with no cookie at all (no 500, no crash)', async () => {
    const res = await request(app).post('/api/auth/logout').send();
    expect(res.status).toBe(200);
  });
});

describe('POST /api/auth/logout-all — "Sign Out Everywhere"', () => {
  it('kills every device session for the user', async () => {
    const user = await makeUser({ email: 'everywhere@example.com' });
    const deviceA = request.agent(app);
    const deviceB = request.agent(app);
    await deviceA.post('/api/auth/login').send({ email: 'everywhere@example.com', password: GOOD_PASSWORD });
    const loginB = await deviceB
      .post('/api/auth/login')
      .send({ email: 'everywhere@example.com', password: GOOD_PASSWORD });
    const tokenB = loginB.body.data.token;

    const logoutAllRes = await deviceA
      .post('/api/auth/logout-all')
      .set('Authorization', `Bearer ${loginB.body.data.token}`) // any still-valid access token for this user works
      .send();
    expect(logoutAllRes.status).toBe(200);

    const refreshA = await deviceA.post('/api/auth/refresh').send();
    const refreshB = await deviceB.post('/api/auth/refresh').send();
    expect(refreshA.status).toBe(401);
    expect(refreshB.status).toBe(401);
  });
});

describe('GET /api/auth/sessions and DELETE /api/auth/sessions/:id — ownership', () => {
  it('lists only the caller own active sessions', async () => {
    const userA = await makeUser({ email: 'sessionsA@example.com' });
    const userB = await makeUser({ email: 'sessionsB@example.com' });
    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sessionsA@example.com', password: GOOD_PASSWORD });
    await request(app).post('/api/auth/login').send({ email: 'sessionsB@example.com', password: GOOD_PASSWORD });

    const res = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${loginA.body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sessions).toHaveLength(1);
  });

  it('parent A cannot revoke parent Bs session by id', async () => {
    await makeUser({ email: 'ownerA@example.com' });
    await makeUser({ email: 'ownerB@example.com' });
    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ownerA@example.com', password: GOOD_PASSWORD });
    await request(app).post('/api/auth/login').send({ email: 'ownerB@example.com', password: GOOD_PASSWORD });

    const bSession = await RefreshToken.findOne({}).sort({ createdAt: -1 }); // most recent = B's
    const res = await request(app)
      .delete(`/api/auth/sessions/${bSession._id}`)
      .set('Authorization', `Bearer ${loginA.body.data.token}`);

    expect(res.status).toBe(404);
    const stillActive = await RefreshToken.findById(bSession._id);
    expect(stillActive.revokedAt).toBeNull();
  });
});

describe('DB error during /refresh is a 500, never a 401 (see middleware/auth.js incident note)', () => {
  it('a Mongo lookup failure during refresh does not masquerade as an invalid session', async () => {
    const agent = request.agent(app);
    await makeUser({ email: 'dberror@example.com' });
    await agent.post('/api/auth/login').send({ email: 'dberror@example.com', password: GOOD_PASSWORD });

    const spy = jest
      .spyOn(User, 'findById')
      .mockImplementationOnce(() => {
        throw new Error('simulated Mongo timeout');
      });

    const res = await agent.post('/api/auth/refresh').send();
    expect(res.status).toBe(500);

    spy.mockRestore();
  });
});
