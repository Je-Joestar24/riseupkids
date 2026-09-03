/**
 * Unit tests for admin login OTP flow (auth.services login / verifyLoginOtp / resendLoginOtp).
 * Uses manual mock backend/models/__mocks__/index.js.
 * Run: npm test -- tests/adminLoginOtp.test.js
 */

jest.mock('../models');
jest.mock('../services/mail', () => ({
  sendResetCode: jest.fn().mockResolvedValue(undefined),
  sendLoginOtpCode: jest.fn().mockResolvedValue(undefined),
}));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

const { User, LoginOtpToken } = require('../models');
const mailService = require('../services/mail');
const {
  login,
  verifyLoginOtp,
  resendLoginOtp,
} = require('../services/auth.services');

function makeAdminUser(overrides = {}) {
  return {
    _id: 'admin123',
    email: 'admin@example.com',
    role: 'admin',
    isActive: true,
    lastLogin: null,
    matchPassword: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeParentUser(overrides = {}) {
  return {
    _id: 'parent123',
    email: 'parent@example.com',
    role: 'parent',
    isActive: true,
    lastLogin: null,
    matchPassword: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('auth.services – admin login OTP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.__resetCodeMockUser = null;

    User.findOne.mockImplementation(() => {
      const r = global.__resetCodeMockUser;
      return {
        select: () => Promise.resolve(r),
        then: (resolve, reject) => Promise.resolve(r).then(resolve, reject),
        catch: () => ({}),
      };
    });

    User.findById.mockImplementation(() => ({
      select: jest.fn().mockResolvedValue(global.__resetCodeMockUser),
    }));

    LoginOtpToken.deleteMany.mockResolvedValue({ deletedCount: 0 });
    LoginOtpToken.create.mockResolvedValue({});
    LoginOtpToken.findOne.mockResolvedValue(null);
    LoginOtpToken.deleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  describe('login – admin requires OTP', () => {
    it('does not issue JWT for admin; creates OTP, emails code, returns requiresOtp', async () => {
      const admin = makeAdminUser();
      global.__resetCodeMockUser = admin;

      const result = await login('admin@example.com', 'secret123');

      expect(result).toEqual({
        requiresOtp: true,
        email: 'admin@example.com',
        message: 'A verification code has been sent to your email.',
      });
      expect(result.token).toBeUndefined();
      expect(LoginOtpToken.deleteMany).toHaveBeenCalledWith({ userId: 'admin123' });
      expect(LoginOtpToken.create).toHaveBeenCalledTimes(1);
      const createArg = LoginOtpToken.create.mock.calls[0][0];
      expect(createArg.userId).toBe('admin123');
      expect(createArg.code).toMatch(/^\d{6}$/);
      expect(createArg.expiresAt).toBeInstanceOf(Date);
      const ttlMs = createArg.expiresAt.getTime() - Date.now();
      // Admin login OTP expires in 10 minutes (±5s tolerance for test runtime)
      expect(ttlMs).toBeGreaterThan(9.5 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(10 * 60 * 1000);
      expect(mailService.sendLoginOtpCode).toHaveBeenCalledWith({
        to: 'admin@example.com',
        code: createArg.code,
      });
      // lastLogin should wait until OTP is verified
      expect(admin.save).not.toHaveBeenCalled();
    });

    it('still issues JWT immediately for non-admin roles', async () => {
      const parent = makeParentUser();
      global.__resetCodeMockUser = parent;
      User.findById.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          _id: 'parent123',
          email: 'parent@example.com',
          role: 'parent',
        }),
      }));

      const { ChildProfile } = require('../models');
      ChildProfile.find = jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await login('parent@example.com', 'secret123');

      expect(result.requiresOtp).toBeUndefined();
      expect(result.token).toEqual(expect.any(String));
      expect(result.user).toEqual(
        expect.objectContaining({ email: 'parent@example.com', role: 'parent' })
      );
      expect(LoginOtpToken.create).not.toHaveBeenCalled();
      expect(mailService.sendLoginOtpCode).not.toHaveBeenCalled();
      expect(parent.save).toHaveBeenCalled();
    });

    it('rejects invalid credentials without sending OTP', async () => {
      const admin = makeAdminUser({
        matchPassword: jest.fn().mockResolvedValue(false),
      });
      global.__resetCodeMockUser = admin;

      await expect(login('admin@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
      expect(LoginOtpToken.create).not.toHaveBeenCalled();
      expect(mailService.sendLoginOtpCode).not.toHaveBeenCalled();
    });

    it('rejects inactive admin without sending OTP', async () => {
      global.__resetCodeMockUser = makeAdminUser({ isActive: false });

      await expect(login('admin@example.com', 'secret123')).rejects.toThrow(
        'Account is inactive. Please contact administrator.'
      );
      expect(LoginOtpToken.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyLoginOtp', () => {
    const validToken = {
      _id: 'otp789',
      userId: 'admin123',
      code: '654321',
      expiresAt: new Date(Date.now() + 60000),
    };

    it('throws when email is invalid', async () => {
      await expect(verifyLoginOtp('', '654321')).rejects.toThrow(
        'Please provide a valid email address'
      );
      await expect(verifyLoginOtp('bad', '654321')).rejects.toThrow(
        'Please provide a valid email address'
      );
    });

    it('throws when code is not 6 digits', async () => {
      await expect(verifyLoginOtp('admin@example.com', '12345')).rejects.toThrow(
        'Invalid or expired verification code'
      );
      await expect(verifyLoginOtp('admin@example.com', 'abc123')).rejects.toThrow(
        'Invalid or expired verification code'
      );
    });

    it('throws when user is not an active admin', async () => {
      global.__resetCodeMockUser = makeParentUser({ email: 'admin@example.com' });

      await expect(verifyLoginOtp('admin@example.com', '654321')).rejects.toThrow(
        'Invalid or expired verification code'
      );
      expect(LoginOtpToken.findOne).not.toHaveBeenCalled();
    });

    it('throws when OTP token is missing or expired', async () => {
      global.__resetCodeMockUser = makeAdminUser();
      LoginOtpToken.findOne.mockResolvedValueOnce(null);

      await expect(verifyLoginOtp('admin@example.com', '654321')).rejects.toThrow(
        'Invalid or expired verification code'
      );
    });

    it('accepts spaced code, deletes token, updates lastLogin, returns JWT session', async () => {
      const admin = makeAdminUser();
      global.__resetCodeMockUser = admin;
      LoginOtpToken.findOne.mockResolvedValueOnce(validToken);
      User.findById.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          _id: 'admin123',
          email: 'admin@example.com',
          role: 'admin',
        }),
      }));

      const result = await verifyLoginOtp('  Admin@Example.COM  ', '654 321');

      // looked up by user (not by code) so wrong guesses can be counted (RUK-SEC-007)
      expect(LoginOtpToken.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin123',
          expiresAt: expect.any(Object),
        })
      );
      expect(LoginOtpToken.findOne.mock.calls[0][0]).not.toHaveProperty('code');
      expect(LoginOtpToken.deleteOne).toHaveBeenCalledWith({ _id: 'otp789' });
      expect(admin.lastLogin).toBeInstanceOf(Date);
      expect(admin.save).toHaveBeenCalled();
      expect(result.token).toEqual(expect.any(String));
      expect(result.user).toEqual(
        expect.objectContaining({ email: 'admin@example.com', role: 'admin' })
      );
    });

    it('OTP is single-use: token deleted after success', async () => {
      const admin = makeAdminUser();
      global.__resetCodeMockUser = admin;
      LoginOtpToken.findOne.mockResolvedValueOnce(validToken);
      User.findById.mockImplementation(() => ({
        select: jest.fn().mockResolvedValue({
          _id: 'admin123',
          email: 'admin@example.com',
          role: 'admin',
        }),
      }));

      await verifyLoginOtp('admin@example.com', '654321');
      expect(LoginOtpToken.deleteOne).toHaveBeenCalledWith({ _id: 'otp789' });
    });
  });

  describe('resendLoginOtp', () => {
    it('throws when email invalid', async () => {
      await expect(resendLoginOtp('')).rejects.toThrow('Please provide a valid email address');
    });

    it('throws when no prior challenge exists (blocks spam)', async () => {
      global.__resetCodeMockUser = makeAdminUser();
      LoginOtpToken.findOne.mockResolvedValueOnce(null);

      await expect(resendLoginOtp('admin@example.com')).rejects.toThrow(
        'Unable to resend verification code'
      );
      expect(mailService.sendLoginOtpCode).not.toHaveBeenCalled();
    });

    it('issues a new OTP when a prior challenge exists', async () => {
      global.__resetCodeMockUser = makeAdminUser();
      LoginOtpToken.findOne.mockResolvedValueOnce({
        _id: 'old',
        userId: 'admin123',
        code: '111111',
      });

      const result = await resendLoginOtp('admin@example.com');

      expect(result).toEqual({ sent: true, email: 'admin@example.com' });
      expect(LoginOtpToken.deleteMany).toHaveBeenCalledWith({ userId: 'admin123' });
      expect(LoginOtpToken.create).toHaveBeenCalled();
      expect(mailService.sendLoginOtpCode).toHaveBeenCalled();
    });

    it('throws for non-admin email', async () => {
      global.__resetCodeMockUser = makeParentUser();

      await expect(resendLoginOtp('parent@example.com')).rejects.toThrow(
        'Unable to resend verification code'
      );
    });
  });
});

describe('auth.controller – admin login OTP HTTP contract', () => {
  const authController = require('../controllers/auth.controller');
  const authService = require('../services/auth.services');

  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('login returns requiresOtp payload without token for admin challenge', async () => {
    jest.spyOn(authService, 'login').mockResolvedValueOnce({
      requiresOtp: true,
      email: 'admin@example.com',
      message: 'A verification code has been sent to your email.',
    });

    const req = { body: { email: 'admin@example.com', password: 'secret123' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'A verification code has been sent to your email.',
      data: {
        requiresOtp: true,
        email: 'admin@example.com',
      },
    });
  });

  it('verifyLoginOtp returns session on success', async () => {
    jest.spyOn(authService, 'verifyLoginOtp').mockResolvedValueOnce({
      user: { email: 'admin@example.com', role: 'admin' },
      token: 'jwt-token',
    });

    const req = { body: { email: 'admin@example.com', code: '654321' } };
    const res = mockRes();

    await authController.verifyLoginOtp(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Login successful',
      data: {
        user: { email: 'admin@example.com', role: 'admin' },
        token: 'jwt-token',
      },
    });
  });

  it('verifyLoginOtp returns 401 on invalid code', async () => {
    jest
      .spyOn(authService, 'verifyLoginOtp')
      .mockRejectedValueOnce(new Error('Invalid or expired verification code'));

    const req = { body: { email: 'admin@example.com', code: '000000' } };
    const res = mockRes();

    await authController.verifyLoginOtp(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Invalid or expired verification code',
    });
  });

  it('resendLoginOtp returns 400 when email missing', async () => {
    const req = { body: {} };
    const res = mockRes();

    await authController.resendLoginOtp(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Please provide a valid email address',
    });
  });
});
