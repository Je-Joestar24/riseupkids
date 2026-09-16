/**
 * RUK-SEC-002 — public registration must never create anything but a `parent` account.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-002
 */
jest.mock('../models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  },
  ChildProfile: { find: jest.fn() },
  ChildStats: { findOne: jest.fn() },
  PasswordResetToken: { deleteMany: jest.fn(), create: jest.fn(), findOne: jest.fn() },
  LoginOtpToken: { deleteMany: jest.fn(), create: jest.fn(), findOne: jest.fn() },
}));
// Chunk 9: register() now also issues a refresh token. This file uses a fixture _id
// ("new-user-id") that isn't a real ObjectId, so session.services (a real Mongoose write) is
// mocked out here — it's exercised for real in session.services.test.js.
jest.mock('../services/session.services', () => ({
  issueRefreshToken: jest.fn().mockResolvedValue({ plainToken: 'mock-refresh-token', doc: {} }),
  revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
  revokeAllForUser: jest.fn().mockResolvedValue(undefined),
  REFRESH_TOKEN_TTL_MS: 30 * 24 * 60 * 60 * 1000,
}));
// Chunk 10: register() now also enforces the password policy (length + a real HIBP network
// call). This file is about the role guard, not password policy (which has its own dedicated
// test file), so it's mocked out here to stay deterministic and network-free.
jest.mock('../services/passwordPolicy.service', () => ({
  assertPasswordPolicy: jest.fn().mockResolvedValue(undefined),
  validatePasswordLength: jest.fn(),
  MIN_LENGTH: 12,
}));

const { User } = require('../models');
const authService = require('../services/auth.services');

describe('auth.services register — role guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-only-secret-used-to-sign-tokens-in-tests';
  });

  const baseInput = { name: 'Someone', email: 'someone@example.com', password: 'a-long-enough-test-password-1' };

  it.each(['admin', 'teacher', 'content_creator', 'ADMIN', 'Admin', '', undefined, null])(
    'creates role "parent" even when the caller supplies role=%p',
    async (roleAttempt) => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({ _id: 'new-user-id' });
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue({ _id: 'new-user-id', role: 'parent' }),
      });

      const result = await authService.register({ ...baseInput, role: roleAttempt });

      expect(User.create).toHaveBeenCalledTimes(1);
      // The caller-supplied role never reaches the write — it's always exactly 'parent'.
      expect(User.create.mock.calls[0][0].role).toBe('parent');
      expect(result.token).toBeTruthy();
    }
  );

  it('does not forward a `linkedParent` supplied by the caller', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: 'new-user-id' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'new-user-id', role: 'parent' }),
    });

    await authService.register({ ...baseInput, role: 'admin', linkedParent: 'some-other-user-id' });

    expect(User.create.mock.calls[0][0]).not.toHaveProperty('linkedParent');
  });

  it('still rejects when the email is already registered (unaffected by the role guard)', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing-user' });

    await expect(authService.register({ ...baseInput, role: 'admin' })).rejects.toThrow(
      'User already exists with this email'
    );
    expect(User.create).not.toHaveBeenCalled();
  });

  it('still validates required fields before touching the role at all', async () => {
    await expect(
      authService.register({ email: 'x@example.com', password: 'p', role: 'admin' })
    ).rejects.toThrow('Please provide name, email, and password');
    expect(User.findOne).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });
});
