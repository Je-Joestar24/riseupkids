/**
 * Chunk 10 follow-up — User.twoFactorEnabled (read by authorize()) drifting from
 * TwoFactorSecret.enabled (read by login). An admin enrolled before the mirror existed gets TOTP-only
 * login (the email OTP is correctly skipped) but then a 403 TWO_FACTOR_ENROLLMENT_REQUIRED on every
 * admin call, and can't re-enroll because setup refuses on an already-enabled secret.
 * Fixed by (a) re-syncing the flag on every successful TOTP/recovery login and (b) a backfill script.
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
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { authenticator } = require('otplib');

const { User } = require('../models');
const TwoFactorSecret = require('../models/TwoFactorSecret');
const RecoveryCode = require('../models/RecoveryCode');
const authRoutes = require('../routes/auth.routes');
const errorHandler = require('../middleware/errorHandler');
const { protect, authorize } = require('../middleware/auth');
const { backfillTwoFactorEnabled } = require('../scripts/backfillTwoFactorEnabled');
const jwt = require('jsonwebtoken');

jest.setTimeout(60000);

const GOOD_PASSWORD = 'a-fine-test-password-99';

function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.get('/api/admin-only', protect, authorize('admin'), (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

let mongod;
let app;

function bearerFor(user) {
  return jwt.sign({ id: user._id.toString(), tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Reproduces the broken state: an enabled secret, but the User mirror flag still false.
async function createDriftedAdmin(email) {
  const user = await User.create({ name: 'A', email, password: GOOD_PASSWORD, role: 'admin' });
  const setup = await request(app)
    .post('/api/auth/2fa/setup')
    .set('Authorization', `Bearer ${bearerFor(user)}`)
    .send();
  const secret = setup.body.data.secret;
  await request(app)
    .post('/api/auth/2fa/verify-setup')
    .set('Authorization', `Bearer ${bearerFor(user)}`)
    .send({ code: authenticator.generate(secret) });
  await User.updateOne({ _id: user._id }, { twoFactorEnabled: false });
  return { user, secret };
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
  await Promise.all([User.deleteMany({}), TwoFactorSecret.deleteMany({}), RecoveryCode.deleteMany({})]);
});

describe('drifted admin (secret enabled, User.twoFactorEnabled=false)', () => {
  it('reproduces the lockout: TOTP-only login, then the admin gate 403s', async () => {
    const { user } = await createDriftedAdmin('drift1@example.com');

    const loginRes = await request(app).post('/api/auth/login').send({ email: 'drift1@example.com', password: GOOD_PASSWORD });
    expect(loginRes.body.data.requiresTwoFactor).toBe(true);
    expect(loginRes.body.data.requiresOtp).toBeUndefined();

    const gate = await request(app).get('/api/admin-only').set('Authorization', `Bearer ${bearerFor(user)}`);
    expect(gate.status).toBe(403);
    expect(gate.body.code).toBe('TWO_FACTOR_ENROLLMENT_REQUIRED');
  });

  it('a successful TOTP login re-syncs the flag, so the admin gate opens', async () => {
    const { user, secret } = await createDriftedAdmin('drift2@example.com');

    const verifyRes = await request(app)
      .post('/api/auth/2fa/login-verify')
      .send({ email: 'drift2@example.com', code: authenticator.generate(secret) });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.twoFactorEnrollmentRequired).toBe(false);

    const fresh = await User.findById(user._id);
    expect(fresh.twoFactorEnabled).toBe(true);

    const gate = await request(app).get('/api/admin-only').set('Authorization', `Bearer ${bearerFor(user)}`);
    expect(gate.status).toBe(200);
  });
});

describe('backfillTwoFactorEnabled', () => {
  it('sets the flag where a secret is enabled, clears it where none exists, and is idempotent', async () => {
    const { user: drifted } = await createDriftedAdmin('drift3@example.com');
    const stale = await User.create({
      name: 'S', email: 'stale@example.com', password: GOOD_PASSWORD, role: 'admin', twoFactorEnabled: true,
    });
    const untouched = await User.create({ name: 'U', email: 'plain@example.com', password: GOOD_PASSWORD, role: 'parent' });

    const first = await backfillTwoFactorEnabled();
    expect(first).toEqual({ enabledSet: 1, enabledCleared: 1 });

    expect((await User.findById(drifted._id)).twoFactorEnabled).toBe(true);
    expect((await User.findById(stale._id)).twoFactorEnabled).toBe(false);
    expect((await User.findById(untouched._id)).twoFactorEnabled).toBe(false);

    const second = await backfillTwoFactorEnabled();
    expect(second).toEqual({ enabledSet: 0, enabledCleared: 0 });
  });
});
