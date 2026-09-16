/**
 * Chunk 10 — TOTP login flow, full stack: password check -> requiresTwoFactor -> a real TOTP
 * (or recovery) code completes the session. Also proves the admin email-OTP fallback still works
 * for an admin who hasn't enrolled TOTP yet, and that a parent/teacher's 2FA is fully optional.
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
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');

const { User } = require('../models');
const TwoFactorSecret = require('../models/TwoFactorSecret');
const RecoveryCode = require('../models/RecoveryCode');
const authRoutes = require('../routes/auth.routes');
const errorHandler = require('../middleware/errorHandler');

jest.setTimeout(60000);

const GOOD_PASSWORD = 'a-fine-test-password-99';

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

function bearerFor(user) {
  return jwt.sign({ id: user._id.toString(), tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function enrollTotp(app, user) {
  const setupRes = await request(app)
    .post('/api/auth/2fa/setup')
    .set('Authorization', `Bearer ${bearerFor(user)}`)
    .send();
  const secret = setupRes.body.data.secret;
  const confirmRes = await request(app)
    .post('/api/auth/2fa/verify-setup')
    .set('Authorization', `Bearer ${bearerFor(user)}`)
    .send({ code: authenticator.generate(secret) });
  return { secret, recoveryCodes: confirmRes.body.data.recoveryCodes };
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

describe('a parent with TOTP enabled must complete it to log in (2FA is optional but enforced once on)', () => {
  it('login says requiresTwoFactor and issues no token yet', async () => {
    const user = await User.create({ name: 'P', email: 'p1@example.com', password: GOOD_PASSWORD, role: 'parent' });
    await enrollTotp(app, user);

    const res = await request(app).post('/api/auth/login').send({ email: 'p1@example.com', password: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.requiresTwoFactor).toBe(true);
    expect(res.body.data.token).toBeUndefined();
  });

  it('a correct TOTP code at /2fa/login-verify completes the session', async () => {
    const user = await User.create({ name: 'P', email: 'p2@example.com', password: GOOD_PASSWORD, role: 'parent' });
    const { secret } = await enrollTotp(app, user);

    const res = await request(app)
      .post('/api/auth/2fa/login-verify')
      .send({ email: 'p2@example.com', code: authenticator.generate(secret) });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.email).toBe('p2@example.com');
  });

  it('a valid recovery code also completes the session (and is consumed — single use)', async () => {
    const user = await User.create({ name: 'P', email: 'p3@example.com', password: GOOD_PASSWORD, role: 'parent' });
    const { recoveryCodes } = await enrollTotp(app, user);

    const first = await request(app)
      .post('/api/auth/2fa/login-verify')
      .send({ email: 'p3@example.com', code: recoveryCodes[0] });
    expect(first.status).toBe(200);

    const secondAttemptWithSameCode = await request(app)
      .post('/api/auth/2fa/login-verify')
      .send({ email: 'p3@example.com', code: recoveryCodes[0] });
    expect(secondAttemptWithSameCode.status).toBe(401);
  });

  it('a wrong TOTP code is rejected and issues no session', async () => {
    const user = await User.create({ name: 'P', email: 'p4@example.com', password: GOOD_PASSWORD, role: 'parent' });
    await enrollTotp(app, user);

    const res = await request(app)
      .post('/api/auth/2fa/login-verify')
      .send({ email: 'p4@example.com', code: '000000' });

    expect(res.status).toBe(401);
  });
});

describe('a parent WITHOUT 2FA logs in directly — it is optional, not forced', () => {
  it('no requiresTwoFactor, session issued immediately', async () => {
    await User.create({ name: 'P', email: 'p5@example.com', password: GOOD_PASSWORD, role: 'parent' });

    const res = await request(app).post('/api/auth/login').send({ email: 'p5@example.com', password: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.requiresTwoFactor).toBeUndefined();
    expect(res.body.data.token).toBeTruthy();
  });
});

describe('admin: TOTP takes priority once enrolled; email-OTP fallback still works before that', () => {
  it('an admin with NO TOTP enrolled still gets the email-OTP challenge (fallback intact)', async () => {
    await User.create({ name: 'A', email: 'a1@example.com', password: GOOD_PASSWORD, role: 'admin' });

    const res = await request(app).post('/api/auth/login').send({ email: 'a1@example.com', password: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.requiresOtp).toBe(true);
    expect(res.body.data.requiresTwoFactor).toBeUndefined();
  });

  it('an admin who HAS enrolled TOTP gets requiresTwoFactor instead of the email OTP', async () => {
    const admin = await User.create({ name: 'A', email: 'a2@example.com', password: GOOD_PASSWORD, role: 'admin' });
    await enrollTotp(app, admin);

    const res = await request(app).post('/api/auth/login').send({ email: 'a2@example.com', password: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.requiresTwoFactor).toBe(true);
    expect(res.body.data.requiresOtp).toBeUndefined();
  });

  it('an admin session carries twoFactorEnrollmentRequired: true until they enroll TOTP', async () => {
    const admin = await User.create({ name: 'A', email: 'a3@example.com', password: GOOD_PASSWORD, role: 'admin', isActive: true });
    // Complete login via the email-OTP fallback path directly against the service layer's own
    // session-issuing helper by hitting /me after minting a token the same way the OTP flow would.
    const token = bearerFor(admin);
    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.twoFactorEnrollmentRequired).toBe(true);
  });

  it('twoFactorEnrollmentRequired flips to false once TOTP is enrolled', async () => {
    const admin = await User.create({ name: 'A', email: 'a4@example.com', password: GOOD_PASSWORD, role: 'admin' });
    await enrollTotp(app, admin);

    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${bearerFor(admin)}`);

    expect(meRes.body.data.twoFactorEnrollmentRequired).toBe(false);
  });

  it('a parent /me response never includes twoFactorEnrollmentRequired at all (admin-only concept)', async () => {
    const parent = await User.create({ name: 'P', email: 'p6@example.com', password: GOOD_PASSWORD, role: 'parent' });

    const meRes = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${bearerFor(parent)}`);

    expect(meRes.body.data.twoFactorEnrollmentRequired).toBeUndefined();
  });
});

describe('disabling 2FA requires both password and a valid code', () => {
  it('cannot disable with only the password (wrong/missing code)', async () => {
    const user = await User.create({ name: 'P', email: 'p7@example.com', password: GOOD_PASSWORD, role: 'parent' });
    await enrollTotp(app, user);

    const res = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${bearerFor(user)}`)
      .send({ password: GOOD_PASSWORD, code: '000000' });

    expect(res.status).toBe(401);
  });

  it('cannot disable with only a valid code but the wrong password', async () => {
    const user = await User.create({ name: 'P', email: 'p8@example.com', password: GOOD_PASSWORD, role: 'parent' });
    const { secret } = await enrollTotp(app, user);

    const res = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${bearerFor(user)}`)
      .send({ password: 'totally-wrong-password', code: authenticator.generate(secret) });

    expect(res.status).toBe(401);
  });

  it('disables with the correct password AND a valid code', async () => {
    const user = await User.create({ name: 'P', email: 'p9@example.com', password: GOOD_PASSWORD, role: 'parent' });
    const { secret } = await enrollTotp(app, user);

    const res = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${bearerFor(user)}`)
      .send({ password: GOOD_PASSWORD, code: authenticator.generate(secret) });

    expect(res.status).toBe(200);

    const statusRes = await request(app)
      .get('/api/auth/2fa/status')
      .set('Authorization', `Bearer ${bearerFor(user)}`);
    expect(statusRes.body.data.enabled).toBe(false);
  });
});
