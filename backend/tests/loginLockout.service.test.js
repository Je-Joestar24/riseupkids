/**
 * RUK-SEC-007 — per-account lockout after repeated failed password logins.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-007
 */
jest.mock('../models', () => ({
  User: {
    updateOne: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
  },
}));

const { User } = require('../models');
const lockout = require('../services/loginLockout.service');

const CFG = {
  LOGIN_LOCKOUT_THRESHOLD: '3',
  LOGIN_LOCKOUT_BASE_MS: '1000',
  LOGIN_LOCKOUT_MAX_MS: '8000',
  LOGIN_LOCKOUT_ATTEMPT_RESET_MS: '100000',
};
const CFG_SNAPSHOT = {};

beforeAll(() => {
  for (const [k, v] of Object.entries(CFG)) {
    CFG_SNAPSHOT[k] = process.env[k];
    process.env[k] = v;
  }
});
afterAll(() => {
  for (const [k, v] of Object.entries(CFG_SNAPSHOT)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(() => {
  jest.clearAllMocks();
  User.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
});

describe('isAccountLocked', () => {
  const now = 1_000_000;
  it('true only while lockUntil is in the future', () => {
    expect(lockout.isAccountLocked({ lockUntil: new Date(now + 5000) }, now)).toBe(true);
    expect(lockout.isAccountLocked({ lockUntil: new Date(now - 5000) }, now)).toBe(false);
    expect(lockout.isAccountLocked({ lockUntil: null }, now)).toBe(false);
    expect(lockout.isAccountLocked({}, now)).toBe(false);
    expect(lockout.isAccountLocked(null, now)).toBe(false);
  });
});

describe('computeLockMs (threshold 3, base 1000, cap 8000)', () => {
  it('is the base at the threshold and doubles per extra failure, capped', () => {
    expect(lockout.computeLockMs(3)).toBe(1000); // at threshold
    expect(lockout.computeLockMs(4)).toBe(2000);
    expect(lockout.computeLockMs(5)).toBe(4000);
    expect(lockout.computeLockMs(6)).toBe(8000);
    expect(lockout.computeLockMs(7)).toBe(8000); // capped
    expect(lockout.computeLockMs(20)).toBe(8000); // capped
  });
});

describe('registerFailedLogin', () => {
  const now = 5_000_000;

  it('counts the first failure without locking', async () => {
    const user = { _id: 'u1', failedLoginAttempts: 0, lastFailedLoginAt: null };
    const res = await lockout.registerFailedLogin(user, now);

    expect(res).toMatchObject({ attempts: 1, lockUntil: null, justLocked: false });
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'u1' },
      { $set: { failedLoginAttempts: 1, lastFailedLoginAt: new Date(now) } }
    );
    expect(user.failedLoginAttempts).toBe(1); // mutated in memory
  });

  it('locks the account exactly when the counter reaches the threshold', async () => {
    const user = { _id: 'u2', failedLoginAttempts: 2, lastFailedLoginAt: new Date(now - 1000) };
    const res = await lockout.registerFailedLogin(user, now);

    expect(res.attempts).toBe(3);
    expect(res.justLocked).toBe(true);
    expect(res.lockUntil).toEqual(new Date(now + 1000)); // base lock
    expect(user.lockUntil).toEqual(new Date(now + 1000));
  });

  it('escalates the lock window on each further failure', async () => {
    const user = { _id: 'u3', failedLoginAttempts: 4, lastFailedLoginAt: new Date(now - 1000) };
    const res = await lockout.registerFailedLogin(user, now);

    expect(res.attempts).toBe(5);
    expect(res.lockUntil).toEqual(new Date(now + 4000)); // base * 2^(5-3)
  });

  it('forgets a stale attempt count before counting the new failure', async () => {
    const user = {
      _id: 'u4',
      failedLoginAttempts: 2,
      lastFailedLoginAt: new Date(now - 200_000), // older than LOGIN_LOCKOUT_ATTEMPT_RESET_MS (100_000)
    };
    const res = await lockout.registerFailedLogin(user, now);

    expect(res.attempts).toBe(1); // reset, not 3
    expect(res.justLocked).toBe(false);
  });
});

describe('clearFailedLogins', () => {
  it('resets everything for a user that had failures / a lock', async () => {
    const user = { _id: 'u5', failedLoginAttempts: 4, lockUntil: new Date(), lastFailedLoginAt: new Date() };
    await lockout.clearFailedLogins(user);

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'u5' },
      { $set: { failedLoginAttempts: 0, lockUntil: null, lastFailedLoginAt: null } }
    );
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockUntil).toBeNull();
  });

  it('is a no-op (no write) when there is nothing to clear', async () => {
    await lockout.clearFailedLogins({ _id: 'u6', failedLoginAttempts: 0, lockUntil: null, lastFailedLoginAt: null });
    expect(User.updateOne).not.toHaveBeenCalled();
  });
});

describe('unlockAccount', () => {
  function mockFoundUser(doc) {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(doc) });
  }

  it('clears the lock and reports it was locked', async () => {
    mockFoundUser({ _id: 'u7', lockUntil: new Date(Date.now() + 60_000) });
    const res = await lockout.unlockAccount('u7');

    expect(res).toEqual({ userId: 'u7', wasLocked: true });
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'u7' },
      { $set: { failedLoginAttempts: 0, lockUntil: null, lastFailedLoginAt: null } }
    );
  });

  it('still clears state (idempotent) when the account was not actually locked', async () => {
    mockFoundUser({ _id: 'u8', lockUntil: null });
    const res = await lockout.unlockAccount('u8');
    expect(res).toEqual({ userId: 'u8', wasLocked: false });
    expect(User.updateOne).toHaveBeenCalled();
  });

  it('throws a 404 error when the user does not exist', async () => {
    mockFoundUser(null);
    await expect(lockout.unlockAccount('missing')).rejects.toMatchObject({ statusCode: 404 });
    expect(User.updateOne).not.toHaveBeenCalled();
  });
});

describe('listLockedAccounts', () => {
  it('queries only currently-locked users and shapes the rows', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([
        { _id: 'a', name: 'A', email: 'a@x.io', role: 'parent', failedLoginAttempts: 9, lockUntil: new Date() },
      ]),
    };
    User.find.mockReturnValue(chain);

    const rows = await lockout.listLockedAccounts();

    const filter = User.find.mock.calls[0][0];
    expect(filter).toHaveProperty('lockUntil.$gt');
    expect(rows).toEqual([
      expect.objectContaining({ _id: 'a', email: 'a@x.io', role: 'parent', failedLoginAttempts: 9 }),
    ]);
  });
});
