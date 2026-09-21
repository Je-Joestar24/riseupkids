/**
 * Chunk 10 follow-up — closes a gap flagged by the client: mandatory admin TOTP enrollment was
 * previously enforced only by a frontend redirect (see AuthedAccess.jsx). An admin session with a
 * fully valid, active token — including one obtained via the email-OTP fallback without ever
 * enrolling TOTP — could still call an admin-gated endpoint directly (curl/Postman/etc.),
 * bypassing the redirect entirely, since `authorize()` never checked 2FA status at all.
 *
 * Fixed with a denormalized `twoFactorEnabled` flag on the User document (kept in sync by
 * twoFactor.services.js's confirmEnrollment()/disable()) instead of a second query against the
 * TwoFactorSecret collection — `protect` already loads the full user document on every request,
 * so `authorize()` reading this field costs nothing extra.
 * @see docs/SECURITY_STRENGTHENING_IMPLEMENTATION_PLAN.md (Chunk 10)
 */
const { authorize } = require('../middleware/auth');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('authorize — admin mandatory 2FA enforcement', () => {
  it('blocks an admin whose session never completed TOTP enrollment', () => {
    const req = { user: { role: 'admin', twoFactorEnabled: false } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TWO_FACTOR_ENROLLMENT_REQUIRED' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks an admin with no twoFactorEnabled field at all (pre-Chunk-10 token/doc shape)', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('lets an enrolled admin through', () => {
    const req = { user: { role: 'admin', twoFactorEnabled: true } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('never applies the 2FA gate to a non-admin role, enrolled or not', () => {
    const req = { user: { role: 'parent', twoFactorEnabled: false } };
    const res = mockRes();
    const next = jest.fn();

    authorize('parent')(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('still rejects on role mismatch BEFORE ever checking 2FA status', () => {
    const req = { user: { role: 'teacher', twoFactorEnabled: false } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/not authorized to access this route/i) })
    );
  });

  it('a route allowing multiple roles still gates the admin case specifically', () => {
    const req = { user: { role: 'admin', twoFactorEnabled: false } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin', 'teacher')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TWO_FACTOR_ENROLLMENT_REQUIRED' })
    );
  });

  it('a teacher passes through a route allowing multiple roles, unaffected by the admin-only gate', () => {
    const req = { user: { role: 'teacher' } };
    const res = mockRes();
    const next = jest.fn();

    authorize('admin', 'teacher')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
