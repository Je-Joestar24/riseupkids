/**
 * RUK-SEC-007 — the login flow honours the account-lockout service:
 * a locked account is rejected before the password check, a wrong password is recorded, and a
 * correct password clears the state. Lockout maths lives in loginLockout.service.test.js.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-007
 */
jest.mock('../services/loginLockout.service', () => ({
  isAccountLocked: jest.fn(),
  registerFailedLogin: jest.fn(),
  clearFailedLogins: jest.fn(),
}));
jest.mock('../models', () => ({
  User: { findOne: jest.fn(), findById: jest.fn() },
  PasswordResetToken: { findOne: jest.fn(), deleteOne: jest.fn(), deleteMany: jest.fn() },
  LoginOtpToken: { deleteMany: jest.fn(), create: jest.fn(), findOne: jest.fn() },
  ChildProfile: { find: jest.fn() },
  ChildStats: { findOne: jest.fn() },
}));
jest.mock('../services/mail', () => ({ sendLoginOtpCode: jest.fn().mockResolvedValue(true) }));

const { User } = require('../models');
const lockout = require('../services/loginLockout.service');
const authService = require('../services/auth.services');

function mockUserRow(overrides = {}) {
  const row = {
    _id: 'user-1',
    email: 'parent@example.com',
    isActive: true,
    role: 'parent',
    lockUntil: null,
    failedLoginAttempts: 0,
    matchPassword: jest.fn(),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(row) });
  return row;
}

let warnSpy;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-only-secret-for-login-lockout-tests';
  // the lockout code logs the real (silenced-to-the-client) reason via console.warn
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  lockout.isAccountLocked.mockReturnValue(false);
  lockout.registerFailedLogin.mockResolvedValue({ attempts: 1, lockUntil: null, justLocked: false });
  lockout.clearFailedLogins.mockResolvedValue(undefined);
});
afterEach(() => warnSpy.mockRestore());

describe('auth.services login — lockout integration', () => {
  it('rejects a locked account BEFORE checking the password', async () => {
    const row = mockUserRow({ lockUntil: new Date(Date.now() + 60_000) });
    lockout.isAccountLocked.mockReturnValue(true);

    await expect(authService.login('parent@example.com', 'whatever')).rejects.toThrow('Invalid credentials');

    expect(row.matchPassword).not.toHaveBeenCalled();
    expect(lockout.registerFailedLogin).not.toHaveBeenCalled();
  });

  it('records a failed attempt on a wrong password and still returns the generic error', async () => {
    const row = mockUserRow();
    row.matchPassword.mockResolvedValue(false);
    lockout.registerFailedLogin.mockResolvedValue({ attempts: 3, lockUntil: null, justLocked: false });

    await expect(authService.login('parent@example.com', 'wrong')).rejects.toThrow('Invalid credentials');

    expect(lockout.registerFailedLogin).toHaveBeenCalledWith(expect.objectContaining({ _id: 'user-1' }));
    expect(lockout.clearFailedLogins).not.toHaveBeenCalled();
  });

  it('surfaces the same generic error when the failed attempt is the one that locks the account', async () => {
    const row = mockUserRow();
    row.matchPassword.mockResolvedValue(false);
    lockout.registerFailedLogin.mockResolvedValue({
      attempts: 8,
      lockUntil: new Date(Date.now() + 60_000),
      justLocked: true,
    });

    await expect(authService.login('parent@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
    expect(lockout.registerFailedLogin).toHaveBeenCalledTimes(1);
  });

  it('clears the lockout state on a correct password (admin path returns before session build)', async () => {
    const row = mockUserRow({ role: 'admin' });
    row.matchPassword.mockResolvedValue(true);

    const result = await authService.login('parent@example.com', 'correct');

    expect(result).toMatchObject({ requiresOtp: true });
    expect(lockout.clearFailedLogins).toHaveBeenCalledWith(expect.objectContaining({ _id: 'user-1' }));
    expect(lockout.registerFailedLogin).not.toHaveBeenCalled();
  });

  it('an inactive account is still rejected before the lockout check even runs', async () => {
    mockUserRow({ isActive: false });

    await expect(authService.login('parent@example.com', 'x')).rejects.toThrow(/inactive/i);
    expect(lockout.isAccountLocked).not.toHaveBeenCalled();
  });
});
