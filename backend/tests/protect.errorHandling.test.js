/**
 * Regression test for a real past incident: `protect`'s catch block used to wrap BOTH JWT
 * verification (a genuine "not authenticated" case) AND the subsequent DB lookup (User.findById)
 * in a single try/catch, returning a blanket 401 "Invalid token" for anything that threw. A
 * transient DB error (or any unrelated bug) during the lookup was indistinguishable from an
 * actually invalid token — and since the frontend treats a 401 as "log the user out," a backend
 * error caused users to be logged out of sessions that were never actually invalid.
 *
 * Fixed by splitting error handling: a JWT verification failure is still 401; anything else
 * (a DB error) now propagates via next(error) to the central error handler as a 500.
 * @see feedback_auth_error_vs_logout memory / docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 9)
 */
const jwt = require('jsonwebtoken');

jest.mock('../models', () => ({ User: { findById: jest.fn() } }));

const { User } = require('../models');
const { protect } = require('../middleware/auth');

const JWT_SECRET = 'test-secret-at-least-32-chars-long-000000';

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

function validToken(payload = { id: 'user-1' }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = JWT_SECRET;
});

describe('protect — genuine token problems are 401', () => {
  it('no Authorization header at all -> 401, no DB call', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(User.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('a malformed/invalid-signature token -> 401, no DB call', async () => {
    const req = { headers: { authorization: 'Bearer not-a-real-jwt' } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(User.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('an expired token -> 401, no DB call', async () => {
    const expired = jwt.sign({ id: 'user-1' }, JWT_SECRET, { expiresIn: '-1s' });
    const req = { headers: { authorization: `Bearer ${expired}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(User.findById).not.toHaveBeenCalled();
  });
});

describe('protect — a genuine server/DB error is a 500 via next(error), NEVER a 401 (the incident)', () => {
  it('User.findById throwing synchronously does not produce a 401', async () => {
    User.findById.mockImplementation(() => {
      throw new Error('simulated Mongo connection error');
    });
    const req = { headers: { authorization: `Bearer ${validToken()}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    // The old bug: this used to be res.status(401).json({..., message: 'Invalid token.' }).
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].message).toBe('simulated Mongo connection error');
  });

  it('User.findById rejecting (async DB error) does not produce a 401', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error('simulated Mongo timeout')),
    });
    const req = { headers: { authorization: `Bearer ${validToken()}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].message).toBe('simulated Mongo timeout');
  });
});

describe('protect — legitimate 401s that DO come from the DB result, not an error', () => {
  it('user not found -> 401 (a real business-logic case, not an error)', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { headers: { authorization: `Bearer ${validToken()}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('inactive user -> 401', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'user-1', isActive: false, tokenVersion: 0 }),
    });
    const req = { headers: { authorization: `Bearer ${validToken()}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('stale tokenVersion (Chunk 9) -> 401 "invalidated", not a generic message', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: 'user-1', isActive: true, tokenVersion: 3 }),
    });
    const req = { headers: { authorization: `Bearer ${validToken({ id: 'user-1', tokenVersion: 1 })}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/invalidated/i) }));
  });

  it('matching tokenVersion -> passes through to next()', async () => {
    const user = { _id: 'user-1', isActive: true, tokenVersion: 2 };
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const req = { headers: { authorization: `Bearer ${validToken({ id: 'user-1', tokenVersion: 2 })}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBe(user);
    expect(res.status).not.toHaveBeenCalled();
  });
});
