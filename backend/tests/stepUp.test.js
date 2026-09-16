/**
 * Chunk 10 — step-up authentication for sensitive admin actions: a fresh TOTP/recovery code is
 * required even in an already logged-in session, expressed as a short-lived, non-transferable
 * signed token the caller attaches to the one sensitive request it's for.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-at-least-32-chars-long-000000';

const { issueStepUpToken, verifyStepUpToken } = require('../services/stepUp.service');
const { requireStepUp } = require('../middleware/stepUp');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('stepUp.service', () => {
  it('a freshly issued token verifies for the same user', () => {
    const token = issueStepUpToken('user-1');
    expect(verifyStepUpToken(token, 'user-1')).toBe(true);
  });

  it('is NOT transferable — a token issued for one user does not verify for another', () => {
    const token = issueStepUpToken('user-1');
    expect(verifyStepUpToken(token, 'user-2')).toBe(false);
  });

  it('rejects a garbage/missing token', () => {
    expect(verifyStepUpToken('not-a-real-token', 'user-1')).toBe(false);
    expect(verifyStepUpToken(undefined, 'user-1')).toBe(false);
    expect(verifyStepUpToken('', 'user-1')).toBe(false);
  });

  it('rejects an expired token', () => {
    // STEP_UP_TOKEN_EXPIRE is read once at module load (like REFRESH_TOKEN_TTL_MS elsewhere) —
    // reset + re-require to get a fresh instance that actually picks up the override.
    jest.resetModules();
    process.env.STEP_UP_TOKEN_EXPIRE = '-1s';
    const fresh = require('../services/stepUp.service');
    const expired = fresh.issueStepUpToken('user-1');
    delete process.env.STEP_UP_TOKEN_EXPIRE;
    expect(fresh.verifyStepUpToken(expired, 'user-1')).toBe(false);
  });

  it('rejects a normal access token that just happens to be well-formed (no stepUp claim)', () => {
    const jwt = require('jsonwebtoken');
    const normalAccessToken = jwt.sign({ id: 'user-1', tokenVersion: 0 }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    });
    expect(verifyStepUpToken(normalAccessToken, 'user-1')).toBe(false);
  });
});

describe('requireStepUp middleware', () => {
  it('calls next() with a valid, matching step-up token', () => {
    const token = issueStepUpToken('user-1');
    const req = { headers: { 'x-step-up-token': token }, user: { _id: 'user-1' } };
    const res = mockRes();
    const next = jest.fn();

    requireStepUp(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects with 403 STEP_UP_REQUIRED when the header is missing', () => {
    const req = { headers: {}, user: { _id: 'user-1' } };
    const res = mockRes();
    const next = jest.fn();

    requireStepUp(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'STEP_UP_REQUIRED' }));
  });

  it('rejects a step-up token issued for a DIFFERENT user (e.g. admin A cannot reuse admin Bs step-up token)', () => {
    const token = issueStepUpToken('admin-B');
    const req = { headers: { 'x-step-up-token': token }, user: { _id: 'admin-A' } };
    const res = mockRes();
    const next = jest.fn();

    requireStepUp(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
