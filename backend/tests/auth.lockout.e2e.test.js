/**
 * RUK-SEC-007 — end-to-end: the WHOLE real stack (auth.routes.js -> controllers -> auth.services
 * -> loginLockout.service -> Mongoose models -> a real in-memory MongoDB), driven over HTTP with
 * supertest. Proves the lockout actually locks, stays silent, auto-recovers, is cleared by a
 * password reset, and can be cleared by the real admin endpoint.
 *
 * Uses mongodb-memory-server (real mongod, no external services).
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-007
 */
// Env for this file only — snapshotted and restored in afterAll so the full --runInBand suite
// (which shares process.env) is not affected (e.g. mail.test.js relies on the real MAIL_DRIVER).
const ENV = {
  JWT_SECRET: process.env.JWT_SECRET || 'e2e-only-secret-that-is-long-enough-1234567890',
  MAIL_DRIVER: 'log',
  AUTH_LOGIN_MAX: '100000', // keep the per-IP limiter out of the way — this file is about lockout
  AUTH_PASSWORD_RESET_MAX: '100000',
  LOGIN_LOCKOUT_THRESHOLD: '3', // fast, deterministic lockout for the test
  LOGIN_LOCKOUT_BASE_MS: '800',
  LOGIN_LOCKOUT_MAX_MS: '4000',
  LOGIN_LOCKOUT_ATTEMPT_RESET_MS: '3600000',
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { User, PasswordResetToken } = require('../models');
const authRoutes = require('../routes/auth.routes');
const adminAccountSecurityRoutes = require('../routes/adminAccountSecurity.routes');
const { isAccountLocked } = require('../services/loginLockout.service');

jest.setTimeout(60000);

const GOOD_PASSWORD = 'CorrectHorse42';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildApp() {
  const app = express();
  app.set('trust proxy', false);
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/admin/account-security', adminAccountSecurityRoutes);
  return app;
}

let mongod;
let app;

async function makeUser({ email, role = 'parent', password = GOOD_PASSWORD }) {
  return User.create({ name: 'E2E User', email, password, role });
}
const bearerFor = (user) => `Bearer ${jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
const lockFields = (email) =>
  User.findOne({ email }).select('+failedLoginAttempts +lockUntil +lastFailedLoginAt').lean();

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
  await Promise.all([User.deleteMany({}), PasswordResetToken.deleteMany({})]);
});

describe('RUK-SEC-007 account lockout — full-stack e2e', () => {
  it('locks the account after the threshold of wrong passwords, silently', async () => {
    const email = 'lockme@example.com';
    await makeUser({ email });

    for (let i = 1; i <= 3; i += 1) {
      const res = await request(app).post('/api/auth/login').send({ email, password: 'nope' });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ success: false, message: 'Invalid credentials' });
    }

    const row = await lockFields(email);
    expect(row.failedLoginAttempts).toBe(3);
    expect(isAccountLocked(row)).toBe(true);
  });

  it('rejects the CORRECT password while locked, with the same generic error', async () => {
    const email = 'stilllocked@example.com';
    await makeUser({ email });
    for (let i = 0; i < 3; i += 1) {
      await request(app).post('/api/auth/login').send({ email, password: 'nope' });
    }

    const res = await request(app).post('/api/auth/login').send({ email, password: GOOD_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials'); // no hint that it's a lockout
  });

  it('lets the user log in once the lock window passes, and clears the lock state', async () => {
    const email = 'recover@example.com';
    await makeUser({ email });
    for (let i = 0; i < 3; i += 1) {
      await request(app).post('/api/auth/login').send({ email, password: 'nope' });
    }

    await sleep(1000); // > LOGIN_LOCKOUT_BASE_MS (800)

    const res = await request(app).post('/api/auth/login').send({ email, password: GOOD_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();

    const row = await lockFields(email);
    expect(row.failedLoginAttempts).toBe(0);
    expect(row.lockUntil).toBeNull();
  });

  it('a correct password before any lockout resets a partial failed-attempt count', async () => {
    const email = 'partial@example.com';
    await makeUser({ email });
    await request(app).post('/api/auth/login').send({ email, password: 'nope' });
    await request(app).post('/api/auth/login').send({ email, password: 'nope' }); // 2 of 3

    const ok = await request(app).post('/api/auth/login').send({ email, password: GOOD_PASSWORD });
    expect(ok.status).toBe(200);

    const row = await lockFields(email);
    expect(row.failedLoginAttempts).toBe(0);
  });

  it('a successful password reset clears an active lock', async () => {
    const email = 'resetunlocks@example.com';
    const user = await makeUser({ email });
    for (let i = 0; i < 3; i += 1) {
      await request(app).post('/api/auth/login').send({ email, password: 'nope' });
    }
    expect(isAccountLocked(await lockFields(email))).toBe(true);

    await PasswordResetToken.create({
      userId: user._id,
      code: '123456',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ email, code: '123456', newPassword: 'BrandNewPass99' });
    expect(reset.status).toBe(200);

    // immediately (lock window has NOT elapsed) the new password works
    const login = await request(app).post('/api/auth/login').send({ email, password: 'BrandNewPass99' });
    expect(login.status).toBe(200);

    const row = await lockFields(email);
    expect(row.failedLoginAttempts).toBe(0);
    expect(row.lockUntil).toBeNull();
  });
});

describe('RUK-SEC-007 admin account-security endpoints — full-stack e2e', () => {
  async function lockOut(email) {
    for (let i = 0; i < 3; i += 1) {
      await request(app).post('/api/auth/login').send({ email, password: 'nope' });
    }
  }

  it('an admin can list locked accounts and unlock one; the user can then log in immediately', async () => {
    const admin = await makeUser({ email: 'admin@example.com', role: 'admin', password: 'AdminPass123' });
    const victimEmail = 'victim@example.com';
    const victim = await makeUser({ email: victimEmail });
    await lockOut(victimEmail);

    const list = await request(app)
      .get('/api/admin/account-security/locked')
      .set('Authorization', bearerFor(admin));
    expect(list.status).toBe(200);
    expect(list.body.data.map((r) => r.email)).toContain(victimEmail);

    const unlock = await request(app)
      .post(`/api/admin/account-security/${victim._id}/unlock`)
      .set('Authorization', bearerFor(admin));
    expect(unlock.status).toBe(200);
    expect(unlock.body.data).toMatchObject({ wasLocked: true });

    const row = await lockFields(victimEmail);
    expect(row.failedLoginAttempts).toBe(0);
    expect(row.lockUntil).toBeNull();

    // and the previously-locked user can now sign in right away
    const login = await request(app).post('/api/auth/login').send({ email: victimEmail, password: GOOD_PASSWORD });
    expect(login.status).toBe(200);
  });

  it('a non-admin (parent) is rejected with 403', async () => {
    const parent = await makeUser({ email: 'justaparent@example.com' });
    const res = await request(app)
      .get('/api/admin/account-security/locked')
      .set('Authorization', bearerFor(parent));
    expect(res.status).toBe(403);
  });

  it('an unauthenticated request is rejected with 401', async () => {
    const res = await request(app).get('/api/admin/account-security/locked');
    expect(res.status).toBe(401);
  });

  it('unlocking a non-existent user returns 404', async () => {
    const admin = await makeUser({ email: 'admin2@example.com', role: 'admin', password: 'AdminPass123' });
    const res = await request(app)
      .post(`/api/admin/account-security/${new mongoose.Types.ObjectId()}/unlock`)
      .set('Authorization', bearerFor(admin));
    expect(res.status).toBe(404);
  });
});
