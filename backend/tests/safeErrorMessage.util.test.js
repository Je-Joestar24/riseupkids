/**
 * RUK-SEC-011 follow-up — safeErrorMessage() must not leak third-party API detail in production.
 * @see docs/SECURITY_AUDIT_2026.md#ruk-sec-011
 */
const { safeErrorMessage, isProdLike } = require('../utils/safeErrorMessage');

const NODE_ENV = process.env.NODE_ENV;
afterEach(() => {
  process.env.NODE_ENV = NODE_ENV;
});

describe('isProdLike', () => {
  it('true for production and staging, false otherwise', () => {
    process.env.NODE_ENV = 'production';
    expect(isProdLike()).toBe(true);
    process.env.NODE_ENV = 'staging';
    expect(isProdLike()).toBe(true);
    process.env.NODE_ENV = 'development';
    expect(isProdLike()).toBe(false);
    process.env.NODE_ENV = 'test';
    expect(isProdLike()).toBe(false);
  });
});

describe('safeErrorMessage', () => {
  const leaky = new Error(
    'PayPal getAccessToken failed: HTTP 401 | PayPal-Debug-Id: abc123 | invalid_client | {"error_description":"Client Authentication failed"}'
  );

  it('production: always returns the generic fallback, never the real message', () => {
    process.env.NODE_ENV = 'production';
    expect(safeErrorMessage(leaky, 'Failed to create PayPal order.')).toBe('Failed to create PayPal order.');
  });

  it('staging: same as production', () => {
    process.env.NODE_ENV = 'staging';
    expect(safeErrorMessage(leaky, 'Failed to create PayPal order.')).toBe('Failed to create PayPal order.');
  });

  it('development: returns the real message (useful while building against a sandbox)', () => {
    process.env.NODE_ENV = 'development';
    expect(safeErrorMessage(leaky, 'fallback')).toBe(leaky.message);
  });

  it('falls back to the generic message when the error has no message', () => {
    process.env.NODE_ENV = 'development';
    expect(safeErrorMessage({}, 'fallback')).toBe('fallback');
    expect(safeErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
