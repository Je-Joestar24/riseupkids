/**
 * RUK-SEC-007 — admin account-security endpoints: admin-only, and they call the lockout service.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-007
 */
let mockCurrentUser = null;

jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    if (!mockCurrentUser) return res.status(401).json({ success: false, message: 'no token' });
    req.user = mockCurrentUser;
    next();
  },
  authorize:
    (...roles) =>
    (req, res, next) =>
      roles.includes(req.user.role)
        ? next()
        : res.status(403).json({ success: false, message: 'forbidden' }),
}));

jest.mock('../services/loginLockout.service', () => ({
  unlockAccount: jest.fn(),
  listLockedAccounts: jest.fn(),
}));

const express = require('express');
const request = require('supertest');
const lockoutService = require('../services/loginLockout.service');
const adminAccountSecurityRoutes = require('../routes/adminAccountSecurity.routes');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/account-security', adminAccountSecurityRoutes);
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ success: false, message: err.message }));
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUser = null;
});

describe('admin account-security routes — authorization', () => {
  it('401 without authentication', async () => {
    const res = await request(buildApp()).get('/api/admin/account-security/locked');
    expect(res.status).toBe(401);
  });

  it('403 for a parent', async () => {
    mockCurrentUser = { _id: 'p1', role: 'parent', email: 'p@x.io' };
    const res = await request(buildApp()).post('/api/admin/account-security/u1/unlock');
    expect(res.status).toBe(403);
    expect(lockoutService.unlockAccount).not.toHaveBeenCalled();
  });

  it('403 for a teacher', async () => {
    mockCurrentUser = { _id: 't1', role: 'teacher', email: 't@x.io' };
    const res = await request(buildApp()).get('/api/admin/account-security/locked');
    expect(res.status).toBe(403);
  });
});

describe('admin account-security routes — behaviour (as admin)', () => {
  beforeEach(() => {
    mockCurrentUser = { _id: 'admin-1', role: 'admin', email: 'admin@x.io' };
  });

  it('GET /locked returns the service list with a count', async () => {
    lockoutService.listLockedAccounts.mockResolvedValue([
      { _id: 'a', email: 'a@x.io', role: 'parent', failedLoginAttempts: 9, lockUntil: new Date().toISOString() },
    ]);

    const res = await request(buildApp()).get('/api/admin/account-security/locked');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, count: 1 });
    expect(res.body.data).toHaveLength(1);
  });

  it('POST /:userId/unlock unlocks and reports it was locked', async () => {
    lockoutService.unlockAccount.mockResolvedValue({ userId: 'u9', wasLocked: true });

    const res = await request(buildApp()).post('/api/admin/account-security/u9/unlock');

    expect(res.status).toBe(200);
    expect(lockoutService.unlockAccount).toHaveBeenCalledWith('u9');
    expect(res.body.data).toEqual({ userId: 'u9', wasLocked: true });
  });

  it('POST /:userId/unlock returns 404 when the user does not exist', async () => {
    const err = new Error('User not found');
    err.statusCode = 404;
    lockoutService.unlockAccount.mockRejectedValue(err);

    const res = await request(buildApp()).post('/api/admin/account-security/nope/unlock');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false });
  });
});
