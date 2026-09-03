/**
 * RUK-SEC-007 — end-to-end: the 6-digit code caps, exercised over real HTTP against the whole
 * stack (auth.routes.js -> controllers -> auth.services -> Mongoose -> a real in-memory MongoDB).
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-007
 */
// Env for this file only — snapshotted and restored in afterAll (the --runInBand suite shares
// process.env; mail.test.js relies on the real MAIL_DRIVER).
const ENV = {
  JWT_SECRET: process.env.JWT_SECRET || 'e2e-only-secret-that-is-long-enough-1234567890',
  MAIL_DRIVER: 'log',
  AUTH_LOGIN_MAX: '100000',
  AUTH_PASSWORD_RESET_MAX: '100000',
  LOGIN_OTP_MAX_ATTEMPTS: '5',
  PASSWORD_RESET_CODE_MAX_ATTEMPTS: '5',
};
const ENV_SNAPSHOT = {};
for (const [k, v] of Object.entries(ENV)) {
  ENV_SNAPSHOT[k] = process.env[k];
  process.env[k] = v;
}

const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');

const { User, LoginOtpToken, PasswordResetToken } = require('../models');
const authRoutes = require('../routes/auth.routes');

jest.setTimeout(60000);

let mongod;
let app;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  app = express();
  app.set('trust proxy', false);
  app.use(express.json());
  app.use('/api/auth', authRoutes);
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
  await Promise.all([User.deleteMany({}), LoginOtpToken.deleteMany({}), PasswordResetToken.deleteMany({})]);
});

describe('RUK-SEC-007 password-reset code cap — full-stack e2e', () => {
  const email = 'resetcap@example.com';

  async function seedUserAndCode(code = '246810') {
    const user = await User.create({ name: 'X', email, password: 'OldPassword1', role: 'parent' });
    await PasswordResetToken.create({ userId: user._id, code, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
    return user;
  }
  const resetWith = (code, newPassword = 'BrandNewPassword9') =>
    request(app).post('/api/auth/reset-password').send({ email, code, newPassword });

  it('destroys the code after 5 wrong guesses and returns the "too many attempts" message', async () => {
    await seedUserAndCode();

    for (let i = 1; i <= 4; i += 1) {
      const res = await resetWith('999999');
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired reset code');
    }

    const capped = await resetWith('999999');
    expect(capped.status).toBe(400);
    expect(capped.body.message).toBe('Too many attempts. Please request a new code.');

    expect(await PasswordResetToken.countDocuments({})).toBe(0); // token gone

    // even the CORRECT code no longer works — user must request a new one
    const nowWrong = await resetWith('246810');
    expect(nowWrong.status).toBe(400);
    expect(nowWrong.body.message).toBe('Invalid or expired reset code');
  });

  it('a fresh code still works normally (happy path unaffected)', async () => {
    await seedUserAndCode('135791');

    const ok = await resetWith('135791');
    expect(ok.status).toBe(200);

    // new password logs in
    const login = await request(app).post('/api/auth/login').send({ email, password: 'BrandNewPassword9' });
    expect(login.status).toBe(200);
  });

  it('a wrong guess before the cap only increments the counter', async () => {
    await seedUserAndCode('222222');
    await resetWith('000000');
    await resetWith('000000');

    const row = await PasswordResetToken.findOne({}).lean();
    expect(row.attempts).toBe(2);

    // correct code still works while under the cap
    const ok = await resetWith('222222');
    expect(ok.status).toBe(200);
  });
});

describe('RUK-SEC-007 admin login OTP cap — full-stack e2e', () => {
  const email = 'otpcap@example.com';
  const password = 'AdminPassword1';

  async function startAdminLogin() {
    await User.create({ name: 'Admin', email, password, role: 'admin' });
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ requiresOtp: true });
  }
  const verifyWith = (code) => request(app).post('/api/auth/verify-login-otp').send({ email, code });

  it('destroys the OTP after 5 wrong guesses; a further attempt (any code) fails as expired', async () => {
    await startAdminLogin();
    expect(await LoginOtpToken.countDocuments({})).toBe(1);

    for (let i = 1; i <= 4; i += 1) {
      const res = await verifyWith('000000');
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid or expired verification code');
    }

    const capped = await verifyWith('000000');
    expect(capped.status).toBe(401);
    expect(capped.body.message).toBe('Too many attempts. Please request a new code.');

    expect(await LoginOtpToken.countDocuments({})).toBe(0);

    const afterCap = await verifyWith('123456');
    expect(afterCap.status).toBe(401);
    expect(afterCap.body.message).toBe('Invalid or expired verification code');
  });

  it('the real OTP code still completes login when entered correctly', async () => {
    await startAdminLogin();
    const { code } = await LoginOtpToken.findOne({}).lean(); // read the real code the server generated

    // a couple of wrong guesses first, still under the cap
    await verifyWith('000000');

    const res = await verifyWith(code);
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(await LoginOtpToken.countDocuments({})).toBe(0); // consumed
  });
});
