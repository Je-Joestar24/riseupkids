/**
 * Chunk 9 — tokenVersion: a password change/reset invalidates every existing access token
 * IMMEDIATELY, rather than leaving it valid until it naturally expires (previously up to
 * JWT_EXPIRE, e.g. 30 days in the real deployed config). Full stack over real HTTP.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 9)
 */
const ENV = {
  JWT_SECRET: process.env.JWT_SECRET || 'e2e-only-secret-that-is-long-enough-1234567890',
  MAIL_DRIVER: 'log',
  AUTH_LOGIN_MAX: '100000',
  AUTH_PASSWORD_RESET_MAX: '100000',
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

const { User, PasswordResetToken } = require('../models');
const RefreshToken = require('../models/RefreshToken');
const authRoutes = require('../routes/auth.routes');
const errorHandler = require('../middleware/errorHandler');

jest.setTimeout(60000);

const GOOD_PASSWORD = 'CorrectHorse42';

function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(express.json());
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

let mongod;
let app;

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
  await Promise.all([User.deleteMany({}), PasswordResetToken.deleteMany({}), RefreshToken.deleteMany({})]);
});

describe('PUT /api/auth/change-password invalidates the old access token immediately', () => {
  it('a token minted before the change is rejected by protect on the very next request', async () => {
    await User.create({ name: 'U', email: 'change@example.com', password: GOOD_PASSWORD, role: 'parent' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'change@example.com', password: GOOD_PASSWORD });
    const oldToken = loginRes.body.data.token;

    // Old token works before the change.
    const meBefore = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(meBefore.status).toBe(200);

    const changeRes = await request(app)
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ currentPassword: GOOD_PASSWORD, newPassword: 'NewPassword99' });
    expect(changeRes.status).toBe(200);

    // Same (still cryptographically valid, unexpired) token is now rejected.
    const meAfter = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(meAfter.status).toBe(401);
    expect(meAfter.body.message).toMatch(/invalidated/i);

    // A fresh login with the NEW password gets a token that works.
    const reLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'change@example.com', password: 'NewPassword99' });
    expect(reLogin.status).toBe(200);
    const meNew = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reLogin.body.data.token}`);
    expect(meNew.status).toBe(200);
  });

  it('also revokes refresh tokens — the pre-change session cannot silently renew', async () => {
    const agent = request.agent(app);
    await User.create({ name: 'U', email: 'change2@example.com', password: GOOD_PASSWORD, role: 'parent' });
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ email: 'change2@example.com', password: GOOD_PASSWORD });

    await agent
      .put('/api/auth/change-password')
      .set('Authorization', `Bearer ${loginRes.body.data.token}`)
      .send({ currentPassword: GOOD_PASSWORD, newPassword: 'NewPassword99' });

    const refreshAfter = await agent.post('/api/auth/refresh').send();
    expect(refreshAfter.status).toBe(401);
  });
});

describe('POST /api/auth/reset-password invalidates every existing access token', () => {
  it('a token minted before the reset is rejected afterward', async () => {
    await User.create({ name: 'U', email: 'reset@example.com', password: GOOD_PASSWORD, role: 'parent' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@example.com', password: GOOD_PASSWORD });
    const oldToken = loginRes.body.data.token;

    const code = String(
      (await PasswordResetToken.create({
        userId: (await User.findOne({ email: 'reset@example.com' }))._id,
        code: '111111',
        expiresAt: new Date(Date.now() + 60000),
      })).code
    );
    // Note: forgot-password normally generates the code; created directly here for a
    // deterministic test rather than intercepting the outgoing email.

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'reset@example.com', code, newPassword: 'AnotherNew99' });
    expect(resetRes.status).toBe(200);

    const meAfter = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(meAfter.status).toBe(401);
  });
});

describe('a token minted before this feature existed (no tokenVersion claim) still works', () => {
  it('old-format tokens are only rejected once the user has actually been bumped past version 0', async () => {
    const jwt = require('jsonwebtoken');
    const user = await User.create({ name: 'U', email: 'legacy@example.com', password: GOOD_PASSWORD, role: 'parent' });
    const legacyToken = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${legacyToken}`);
    expect(res.status).toBe(200);
  });
});
