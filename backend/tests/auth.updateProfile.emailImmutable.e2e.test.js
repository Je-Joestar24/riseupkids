/**
 * RUK-SEC-021 — PUT /api/auth/update-profile must never change an account's email address.
 * Full stack over real HTTP: a self-service email change with no re-verification would let a
 * compromised session silently change the account's email, then use forgot-password against the
 * new address to seize the account, with no notification anywhere. Applies to every role, since
 * they all share this same endpoint.
 * @see docs/SECURITY_AUDIT_2026.md (RUK-SEC-021)
 */
const crypto = require('crypto');
const ENV = {
  JWT_SECRET: process.env.JWT_SECRET || 'e2e-only-secret-that-is-long-enough-1234567890',
  MAIL_DRIVER: 'log',
  AUTH_LOGIN_MAX: '100000',
  TWO_FACTOR_ENCRYPTION_KEY:
    process.env.TWO_FACTOR_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
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
const authRoutes = require('../routes/auth.routes');
const errorHandler = require('../middleware/errorHandler');
const twoFactorService = require('../services/twoFactor.services');

jest.setTimeout(60000);

const PASSWORD = 'CorrectHorse42';

function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(express.json());
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
  await User.deleteMany({});
});

async function loginAs(email, role) {
  await User.create({ name: 'Original Name', email, password: PASSWORD, role });
  const loginRes = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return loginRes.body.data.token;
}

// Admin login isn't a plain password check (Chunk 10) — it always requires a second factor.
// Enrolling TOTP directly through the service layer (rather than driving the enrollment HTTP
// flow) gets a real, valid session the same way an already-enrolled admin would get one.
async function loginAsEnrolledAdmin(email) {
  const user = await User.create({ name: 'Original Name', email, password: PASSWORD, role: 'admin' });
  const { secret } = await twoFactorService.startEnrollment(user._id, email);
  await twoFactorService.confirmEnrollment(user._id, authenticator.generate(secret));

  const loginRes = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  expect(loginRes.body.data.requiresTwoFactor).toBe(true);

  const verifyRes = await request(app)
    .post('/api/auth/2fa/login-verify')
    .send({ email, code: authenticator.generate(secret) });
  return verifyRes.body.data.token;
}

describe.each([
  ['parent', 'parent@example.com'],
  ['teacher', 'teacher@example.com'],
  ['content_creator', 'creator@example.com'],
])('PUT /api/auth/update-profile ignores email changes — role: %s', (role, email) => {
  it('updates the name but leaves the email exactly as it was, even when a different one is sent', async () => {
    const token = await loginAs(email, role);

    const res = await request(app)
      .put('/api/auth/update-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name', email: 'attacker-controlled@evil.example' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Updated Name');
    expect(res.body.data.user.email).toBe(email);

    const stored = await User.findOne({ _id: res.body.data.user._id ?? res.body.data.user.id });
    expect(stored.email).toBe(email);
  });
});

describe('PUT /api/auth/update-profile ignores email changes — role: admin (TOTP-enrolled)', () => {
  it('updates the name but leaves the email exactly as it was, even when a different one is sent', async () => {
    const email = 'admin@example.com';
    const token = await loginAsEnrolledAdmin(email);

    const res = await request(app)
      .put('/api/auth/update-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name', email: 'attacker-controlled@evil.example' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Updated Name');
    expect(res.body.data.user.email).toBe(email);

    const stored = await User.findOne({ email });
    expect(stored.email).toBe(email);
  });
});

describe('PUT /api/auth/update-profile — no account takeover via email change', () => {
  it('forgot-password still only ever reaches the original email address, never one submitted through update-profile', async () => {
    const token = await loginAs('victim@example.com', 'parent');

    await request(app)
      .put('/api/auth/update-profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Victim', email: 'attacker@evil.example' });

    // The attacker's email never became a valid login/lookup identity for this account.
    const hijacked = await User.findOne({ email: 'attacker@evil.example' });
    expect(hijacked).toBeNull();

    const stillTheOwner = await User.findOne({ email: 'victim@example.com' });
    expect(stillTheOwner).not.toBeNull();
  });
});
