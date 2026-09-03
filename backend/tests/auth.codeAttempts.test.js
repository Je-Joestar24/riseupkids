/**
 * RUK-SEC-007 — the 6-digit admin OTP and password-reset codes are destroyed after too many
 * wrong guesses, so they can't be brute-forced within their validity window.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-007
 */
process.env.LOGIN_OTP_MAX_ATTEMPTS = '5';
process.env.PASSWORD_RESET_CODE_MAX_ATTEMPTS = '5';

jest.mock('../models', () => ({
  User: { findOne: jest.fn(), findById: jest.fn(), updateOne: jest.fn() },
  LoginOtpToken: {
    findOne: jest.fn(), updateOne: jest.fn(), deleteOne: jest.fn(), deleteMany: jest.fn(), create: jest.fn(),
  },
  PasswordResetToken: {
    findOne: jest.fn(), updateOne: jest.fn(), deleteOne: jest.fn(), deleteMany: jest.fn(), create: jest.fn(),
  },
  ChildProfile: { find: jest.fn() },
  ChildStats: { findOne: jest.fn() },
}));
jest.mock('../services/mail', () => ({ sendLoginOtpCode: jest.fn(), sendResetCode: jest.fn() }));
jest.mock('../services/loginLockout.service', () => ({
  isAccountLocked: jest.fn(() => false),
  registerFailedLogin: jest.fn(),
  clearFailedLogins: jest.fn(),
}));

const { User, LoginOtpToken, PasswordResetToken } = require('../models');
const authService = require('../services/auth.services');
const { TOO_MANY_CODE_ATTEMPTS_MESSAGE, codesMatch } = authService;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-only-secret-for-code-attempts-tests';
});

describe('codesMatch (constant-time 6-digit compare)', () => {
  it('matches identical codes and rejects everything else', () => {
    expect(codesMatch('123456', '123456')).toBe(true);
    expect(codesMatch('123456', '123457')).toBe(false);
    expect(codesMatch('123456', '12345')).toBe(false); // different length
    expect(codesMatch('', '')).toBe(false); // empty guard
    expect(codesMatch('123456', undefined)).toBe(false);
  });
});

describe('verifyLoginOtp — wrong-guess cap', () => {
  const admin = { _id: 'admin1', email: 'admin@example.com', role: 'admin', isActive: true, save: jest.fn() };

  beforeEach(() => {
    User.findOne.mockResolvedValue(admin);
  });

  it('counts a wrong code without destroying the token (below the cap)', async () => {
    LoginOtpToken.findOne.mockResolvedValue({ _id: 't1', code: '654321', attempts: 1 });

    await expect(authService.verifyLoginOtp('admin@example.com', '000000')).rejects.toThrow(
      'Invalid or expired verification code'
    );

    expect(LoginOtpToken.updateOne).toHaveBeenCalledWith({ _id: 't1' }, { $set: { attempts: 2 } });
    expect(LoginOtpToken.deleteOne).not.toHaveBeenCalled();
  });

  it('destroys the token and returns the "too many attempts" message on the capped guess', async () => {
    LoginOtpToken.findOne.mockResolvedValue({ _id: 't1', code: '654321', attempts: 4 }); // 5th wrong = cap

    await expect(authService.verifyLoginOtp('admin@example.com', '000000')).rejects.toThrow(
      TOO_MANY_CODE_ATTEMPTS_MESSAGE
    );

    expect(LoginOtpToken.deleteOne).toHaveBeenCalledWith({ _id: 't1' });
    expect(LoginOtpToken.updateOne).not.toHaveBeenCalled();
  });

  it('accepts the correct code and consumes the token', async () => {
    LoginOtpToken.findOne.mockResolvedValue({ _id: 't1', code: '654321', attempts: 3 });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'admin1', email: 'admin@example.com', role: 'admin' }),
    });

    const result = await authService.verifyLoginOtp('admin@example.com', '654321');

    expect(result.token).toEqual(expect.any(String));
    expect(LoginOtpToken.deleteOne).toHaveBeenCalledWith({ _id: 't1' });
    expect(LoginOtpToken.updateOne).not.toHaveBeenCalled();
  });
});

describe('resetPassword — wrong-guess cap', () => {
  const user = {
    _id: 'user1', email: 'user@example.com', password: 'oldhash', save: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
  });

  it('counts a wrong code without destroying the token (below the cap)', async () => {
    PasswordResetToken.findOne.mockResolvedValue({ _id: 'r1', code: '111111', attempts: 0 });

    await expect(
      authService.resetPassword('user@example.com', '999999', 'NewPassword1')
    ).rejects.toThrow('Invalid or expired reset code');

    expect(PasswordResetToken.updateOne).toHaveBeenCalledWith({ _id: 'r1' }, { $set: { attempts: 1 } });
    expect(PasswordResetToken.deleteOne).not.toHaveBeenCalled();
    expect(user.save).not.toHaveBeenCalled();
  });

  it('destroys the token and returns the "too many attempts" message on the capped guess', async () => {
    PasswordResetToken.findOne.mockResolvedValue({ _id: 'r1', code: '111111', attempts: 4 });

    await expect(
      authService.resetPassword('user@example.com', '999999', 'NewPassword1')
    ).rejects.toThrow(TOO_MANY_CODE_ATTEMPTS_MESSAGE);

    expect(PasswordResetToken.deleteOne).toHaveBeenCalledWith({ _id: 'r1' });
    expect(user.save).not.toHaveBeenCalled();
  });

  it('accepts the correct code and resets the password', async () => {
    PasswordResetToken.findOne.mockResolvedValue({ _id: 'r1', code: '111111', attempts: 2 });

    await authService.resetPassword('user@example.com', '111111', 'NewPassword1');

    expect(user.password).toBe('NewPassword1');
    expect(user.save).toHaveBeenCalled();
    expect(PasswordResetToken.deleteOne).toHaveBeenCalledWith({ _id: 'r1' });
  });
});
