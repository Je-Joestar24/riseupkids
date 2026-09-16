/**
 * Chunk 10 — step-up authentication, full stack: an admin with TOTP enabled logs in, enables a
 * sensitive action's gate by calling POST /api/auth/step-up-verify with a fresh code, and only
 * then can reach a step-up-protected endpoint. Real database, real HTTP, real TOTP codes.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 10)
 */
const ENV = {
  JWT_SECRET: process.env.JWT_SECRET || 'e2e-only-secret-that-is-long-enough-1234567890',
  MAIL_DRIVER: 'log',
  AUTH_LOGIN_MAX: '100000',
  AUTH_2FA_MAX: '100000',
  TWO_FACTOR_ENCRYPTION_KEY:
    process.env.TWO_FACTOR_ENCRYPTION_KEY || require('crypto').randomBytes(32).toString('hex'),
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { authenticator } = require('otplib');

const { User } = require('../models');
const TwoFactorSecret = require('../models/TwoFactorSecret');
const authRoutes = require('../routes/auth.routes');
const { protect } = require('../middleware/auth');
const { requireStepUp } = require('../middleware/stepUp');
const errorHandler = require('../middleware/errorHandler');

jest.setTimeout(60000);

const GOOD_PASSWORD = 'CorrectHorse42Admin';

function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  // A stand-in for a real "sensitive admin action" route (e.g. deletion override) — proves
  // requireStepUp works generically, without needing a full deletion-request fixture.
  app.post('/api/admin/sensitive-action', protect, requireStepUp, (req, res) => {
    res.status(200).json({ success: true, message: 'Sensitive action performed.' });
  });
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
  await Promise.all([User.deleteMany({}), TwoFactorSecret.deleteMany({})]);
});

async function makeAdminWithTwoFactor(email) {
  const user = await User.create({ name: 'Admin', email, password: GOOD_PASSWORD, role: 'admin' });
  const setupRes = await request(app)
    .post('/api/auth/2fa/setup')
    .set('Authorization', `Bearer ${bearerFor(user)}`)
    .send();
  const secret = setupRes.body.data.secret;
  await request(app)
    .post('/api/auth/2fa/verify-setup')
    .set('Authorization', `Bearer ${bearerFor(user)}`)
    .send({ code: authenticator.generate(secret) });
  return { user, secret };
}

function bearerFor(user) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: user._id.toString(), tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

describe('a sensitive action is blocked without step-up, allowed with it', () => {
  it('403s with STEP_UP_REQUIRED when no step-up token is attached at all', async () => {
    const { user } = await makeAdminWithTwoFactor('admin1@example.com');

    const res = await request(app)
      .post('/api/admin/sensitive-action')
      .set('Authorization', `Bearer ${bearerFor(user)}`)
      .send();

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('STEP_UP_REQUIRED');
  });

  it('succeeds once a valid step-up token (from a fresh TOTP code) is attached', async () => {
    const { user, secret } = await makeAdminWithTwoFactor('admin2@example.com');

    const stepUpRes = await request(app)
      .post('/api/auth/step-up-verify')
      .set('Authorization', `Bearer ${bearerFor(user)}`)
      .send({ code: authenticator.generate(secret) });
    expect(stepUpRes.status).toBe(200);
    const stepUpToken = stepUpRes.body.data.stepUpToken;
    expect(stepUpToken).toBeTruthy();

    const actionRes = await request(app)
      .post('/api/admin/sensitive-action')
      .set('Authorization', `Bearer ${bearerFor(user)}`)
      .set('X-Step-Up-Token', stepUpToken)
      .send();

    expect(actionRes.status).toBe(200);
  });

  it('rejects step-up verification with a wrong TOTP code', async () => {
    const { user } = await makeAdminWithTwoFactor('admin3@example.com');

    const res = await request(app)
      .post('/api/auth/step-up-verify')
      .set('Authorization', `Bearer ${bearerFor(user)}`)
      .send({ code: '000000' });

    expect(res.status).toBe(401);
  });

  it('a step-up token issued for one admin cannot be used by another admin', async () => {
    const { user: adminA } = await makeAdminWithTwoFactor('adminA@example.com');
    const { user: adminB, secret: secretB } = await makeAdminWithTwoFactor('adminB@example.com');

    const stepUpRes = await request(app)
      .post('/api/auth/step-up-verify')
      .set('Authorization', `Bearer ${bearerFor(adminB)}`)
      .send({ code: authenticator.generate(secretB) });
    const stepUpTokenForB = stepUpRes.body.data.stepUpToken;

    const actionRes = await request(app)
      .post('/api/admin/sensitive-action')
      .set('Authorization', `Bearer ${bearerFor(adminA)}`)
      .set('X-Step-Up-Token', stepUpTokenForB)
      .send();

    expect(actionRes.status).toBe(403);
  });

  it('a user without 2FA enabled cannot complete step-up verification at all', async () => {
    const user = await User.create({
      name: 'No2FA Admin',
      email: 'no2fa@example.com',
      password: GOOD_PASSWORD,
      role: 'admin',
    });

    const res = await request(app)
      .post('/api/auth/step-up-verify')
      .set('Authorization', `Bearer ${bearerFor(user)}`)
      .send({ code: '123456' });

    expect(res.status).toBe(400);
  });
});
