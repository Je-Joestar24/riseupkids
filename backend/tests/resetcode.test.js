/**
 * Unit tests for forgot password / reset code flow (auth.services forgotPassword & resetPassword).
 * Uses manual mock backend/models/__mocks__/index.js. Set global.__resetCodeMockUser to control User.findOne result.
 * Run: npm test -- tests/resetcode.test.js
 */

jest.mock('../models');
jest.mock('../services/mail', () => ({
  sendResetCode: jest.fn().mockResolvedValue(undefined),
}));

const { User, PasswordResetToken } = require('../models');
const mailService = require('../services/mail');
const { forgotPassword, resetPassword } = require('../services/auth.services');

describe('auth.services – reset code (forgot password)', () => {
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
    PasswordResetToken.deleteMany.mockResolvedValue({ deletedCount: 0 });
    PasswordResetToken.create.mockResolvedValue({});
    PasswordResetToken.findOne.mockResolvedValue(null);
    PasswordResetToken.deleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  describe('forgotPassword', () => {
    it('throws when email is missing or empty', async () => {
      await expect(forgotPassword('')).rejects.toThrow('Please provide a valid email address');
      await expect(forgotPassword('   ')).rejects.toThrow('Please provide a valid email address');
      await expect(forgotPassword(null)).rejects.toThrow('Please provide a valid email address');
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it('throws when email format is invalid', async () => {
      await expect(forgotPassword('notanemail')).rejects.toThrow('Please provide a valid email address');
      await expect(forgotPassword('a@')).rejects.toThrow('Please provide a valid email address');
      await expect(forgotPassword('@b.com')).rejects.toThrow('Please provide a valid email address');
      expect(PasswordResetToken.create).not.toHaveBeenCalled();
      expect(mailService.sendResetCode).not.toHaveBeenCalled();
    });

    it('returns { sent: false } when user does not exist and does not send email', async () => {
      global.__resetCodeMockUser = null;

      const result = await forgotPassword('nobody@example.com');

      expect(result).toEqual({ sent: false });
      expect(User.findOne).toHaveBeenCalledWith({ email: 'nobody@example.com' });
      expect(PasswordResetToken.deleteMany).not.toHaveBeenCalled();
      expect(PasswordResetToken.create).not.toHaveBeenCalled();
      expect(mailService.sendResetCode).not.toHaveBeenCalled();
    });

    it('normalizes email (trim and lowercase) when looking up user', async () => {
      global.__resetCodeMockUser = null;

      await forgotPassword('  User@Example.COM  ');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    });

    it('when user exists: deletes old tokens, creates token, sends email, returns { sent: true }', async () => {
      const mockUser = { _id: 'user123', email: 'user@example.com' };
      global.__resetCodeMockUser = mockUser;
      PasswordResetToken.deleteMany.mockResolvedValueOnce({ deletedCount: 0 });
      PasswordResetToken.create.mockResolvedValueOnce({});

      const result = await forgotPassword('user@example.com');

      expect(result).toEqual({ sent: true });
      expect(PasswordResetToken.deleteMany).toHaveBeenCalledWith({ userId: 'user123' });
      expect(PasswordResetToken.create).toHaveBeenCalledTimes(1);
      const createArg = PasswordResetToken.create.mock.calls[0][0];
      expect(createArg.userId).toBe('user123');
      expect(createArg.code).toMatch(/^\d{6}$/);
      expect(createArg.expiresAt).toBeInstanceOf(Date);
      expect(createArg.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(mailService.sendResetCode).toHaveBeenCalledWith({
        to: 'user@example.com',
        code: createArg.code,
      });
    });
  });

  describe('resetPassword', () => {
    const validUser = { _id: 'user456', email: 'user@example.com', password: 'oldHash', save: jest.fn().mockResolvedValue(undefined) };
    const validToken = { _id: 'token789', userId: 'user456', code: '123456', expiresAt: new Date(Date.now() + 60000) };

    beforeEach(() => {
      validUser.save.mockClear();
    });

    it('throws when email is invalid', async () => {
      await expect(resetPassword('', '123456', 'newPass123')).rejects.toThrow('Please provide a valid email address');
      await expect(resetPassword('bad', '123456', 'newPass123')).rejects.toThrow('Please provide a valid email address');
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it('throws when code is not 6 digits', async () => {
      await expect(resetPassword('u@e.com', '12345', 'newPass123')).rejects.toThrow('Invalid or expired reset code');
      await expect(resetPassword('u@e.com', '1234567', 'newPass123')).rejects.toThrow('Invalid or expired reset code');
      await expect(resetPassword('u@e.com', 'abc123', 'newPass123')).rejects.toThrow('Invalid or expired reset code');
    });

    it('throws when newPassword is missing or too short', async () => {
      await expect(resetPassword('u@e.com', '123456', '')).rejects.toThrow('Password must be at least 6 characters');
      await expect(resetPassword('u@e.com', '123456', 'short')).rejects.toThrow('Password must be at least 6 characters');
      await expect(resetPassword('u@e.com', '123456', 123456)).rejects.toThrow('Password must be at least 6 characters');
    });

    it('accepts code with non-digits stripped (e.g. "123 456" -> "123456")', async () => {
      global.__resetCodeMockUser = validUser;
      PasswordResetToken.findOne.mockResolvedValueOnce(validToken);
      PasswordResetToken.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

      await resetPassword('user@example.com', '123 456', 'newPass123');

      expect(PasswordResetToken.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user456',
          code: '123456',
          expiresAt: expect.any(Object),
        })
      );
    });

    it('throws when user does not exist', async () => {
      global.__resetCodeMockUser = null;

      await expect(resetPassword('nobody@example.com', '123456', 'newPass123')).rejects.toThrow(
        'Invalid or expired reset code'
      );
      expect(PasswordResetToken.findOne).not.toHaveBeenCalled();
    });

    it('throws when token not found or expired', async () => {
      global.__resetCodeMockUser = validUser;
      PasswordResetToken.findOne.mockResolvedValueOnce(null);

      await expect(resetPassword('user@example.com', '123456', 'newPass123')).rejects.toThrow(
        'Invalid or expired reset code'
      );
      expect(validUser.save).not.toHaveBeenCalled();
      expect(PasswordResetToken.deleteOne).not.toHaveBeenCalled();
    });

    it('when valid: updates user password, saves user, deletes token', async () => {
      global.__resetCodeMockUser = validUser;
      PasswordResetToken.findOne.mockResolvedValueOnce(validToken);
      PasswordResetToken.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

      await resetPassword('user@example.com', '123456', 'newPass123');

      expect(validUser.password).toBe('newPass123');
      expect(validUser.save).toHaveBeenCalledTimes(1);
      expect(PasswordResetToken.deleteOne).toHaveBeenCalledWith({ _id: 'token789' });
    });

    it('normalizes email when finding user and token', async () => {
      global.__resetCodeMockUser = validUser;
      PasswordResetToken.findOne.mockResolvedValueOnce(validToken);
      PasswordResetToken.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

      await resetPassword('  User@Example.COM  ', '123456', 'newPass123');

      expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    });
  });
});
